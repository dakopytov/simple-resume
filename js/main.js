// Main site script: parses markdown, builds accordions, sets up UI
(function(){
  const mdPath = 'assets/main-content.md';
  const manifestPath = 'projects/manifest.json';

  // Small, forgiving markdown parser for the content we need
  function parseMarkdownSections(md){
    const lines = md.split(/\r?\n/);
    const sections = {};
    let current = 'intro';
    sections[current] = [];
    for(const line of lines){
      const h2 = line.match(/^##\s+(.*)/);
      const h3 = line.match(/^###\s+(.*)/);
      if(h2){ current = h2[1].trim(); sections[current] = []; continue }
      if(h3){ sections[current].push('<strong>'+h3[1].trim()+'</strong>'); continue }
      if(line.trim()==='') { sections[current].push(''); continue }
      // inline bold **text**
      const html = line.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\[(.*?)\]\((.*?)\)/g,'<a href="$2">$1</a>');
      sections[current].push(html);
    }
    // join paragraphs
    for(const k in sections){
      const parts = [];
      let buffer = [];
      sections[k].forEach(l=>{
        if(l==='') { if(buffer.length){ parts.push('<p>'+buffer.join(' ')+'</p>'); buffer=[] } }
        else buffer.push(l);
      })
      if(buffer.length) parts.push('<p>'+buffer.join(' ')+'</p>');
      sections[k] = parts.join('\n');
    }
    return sections;
  }

  async function loadMain(){
    const res = await fetch(mdPath);
    const md = await res.text();
    const sections = parseMarkdownSections(md);
    // fill competencies
    document.getElementById('competencies-content').innerHTML = sections['Core Competencies'] || '';
    // professional experience: we'll parse subsections starting with 'Professional Experience'
    const prof = sections['Professional Experience'] || '';
    // The MD contains role headings using ### – we'll reparse raw md to extract blocks
    renderExperience(md);
    document.getElementById('additional-us').innerHTML = sections['Additional U.S. Experience'] || '';
    document.getElementById('education-content').innerHTML = sections['Education'] || '';
    document.getElementById('languages-content').innerHTML = sections['Languages'] || '';
    // footer contact info: top of file before first heading
    const intro = sections['intro'] || '';
    document.getElementById('footer-contact').innerHTML = intro.replace(/\n/g,'');
  }

  // Build accordion items from the raw md, extracting each role under Professional Experience
  function renderExperience(md){
    const expStart = md.split('\n## Professional Experience')[1] || '';
    const [mainPart, rest] = expStart.split('\n## Additional U.S. Experience');
    const lines = mainPart.split(/\r?\n/);
    const container = document.getElementById('experience-list');
    container.innerHTML = '';
    let currentTitle = null; let block = [];
    for(const line of lines){
      const h3 = line.match(/^###\s+(.+)/);
      if(h3){
        if(currentTitle){ addExpItem(container,currentTitle, block.join('\n')) }
        currentTitle = h3[1].trim(); block = [];
      } else {
        block.push(line);
      }
    }
    if(currentTitle){ addExpItem(container,currentTitle, block.join('\n')) }
    // additional experience
    const addStart = md.split('\n## Additional Experience')[1] || '';
    const addLines = addStart.split(/\r?\n/);
    const addContainer = document.getElementById('additional-experience');
    addContainer.innerHTML='';
    currentTitle=null; block=[];
    for(const line of addLines){
      const h3=line.match(/^###\s+(.+)/);
      if(h3){ if(currentTitle){ addExpItem(addContainer,currentTitle,block.join('\n')) } currentTitle=h3[1].trim(); block=[] }
      else block.push(line);
    }
    if(currentTitle){ addExpItem(addContainer,currentTitle,block.join('\n')) }
  }

  function addExpItem(container,title,mdBody){
    const item = document.createElement('div'); item.className='item';
    const t = document.createElement('div'); t.className='title'; t.innerHTML = '<div><strong>'+title+'</strong></div><div class="muted">▾</div>';
    const b = document.createElement('div'); b.className='body prose';
    // convert bullet lines to ul
    const html = mdBody.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{
      if(l.startsWith('- ')) return '<li>'+l.slice(2)+'</li>';
      return '<p>'+l.replace(/^\*\*(.*)\*\*/,'<strong>$1</strong>')+'</p>';
    }).join('');
    // try to wrap li into ul
    const bodyHtml = html.includes('<li>') ? '<ul>'+html+'</ul>' : html;
    b.innerHTML = bodyHtml;
    t.addEventListener('click',()=>{ item.classList.toggle('open') });
    item.appendChild(t); item.appendChild(b); container.appendChild(item);
  }

  // Projects
  async function loadProjects(){
    const mres = await fetch(manifestPath); const manifest = await mres.json();
    const grid = document.getElementById('projects-grid'); grid.innerHTML='';
    for(const p of manifest.projects){
      const card = document.createElement('article'); card.className='project-card';
      const img = document.createElement('img'); img.src = p.image; img.alt = '';
      const meta = document.createElement('div'); meta.className='meta';
      const h = document.createElement('h3'); h.textContent = 'Project';
      const teaser = document.createElement('div'); teaser.className='teaser muted'; teaser.textContent = 'Loading…';
      meta.appendChild(h); meta.appendChild(teaser);
      card.appendChild(img); card.appendChild(meta);
      grid.appendChild(card);
      // fetch md to extract title and first paragraph
      try{
        const r = await fetch(p.md);
        const text = await r.text();
        const titleMatch = text.match(/^#\s+(.*)/m);
        const title = titleMatch ? titleMatch[1].trim() : 'Project';
        const para = text.split(/\r?\n\r?\n/).slice(1,2).join(' ').trim(); // first paragraph after heading
        h.textContent = title;
        teaser.textContent = (para||'').replace(/\n/g,' ').slice(0,180) + (para.length>180 ? '…':'' );
      }catch(e){ teaser.textContent = '' }
    }
  }

  // UI: nav toggle + smooth scroll
  function setupUI(){
    const toggle = document.getElementById('nav-toggle'); const nav = document.getElementById('nav');
    // Toggle the mobile nav by adding/removing the 'open' class and set aria state
    toggle.addEventListener('click',()=>{
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    // Smooth scroll for anchors and close mobile nav after selection
    document.querySelectorAll('a[href^="#"]').forEach(a=>{
      a.addEventListener('click',e=>{
        const href = a.getAttribute('href'); if(href.startsWith('#')){
          e.preventDefault(); const target = document.querySelector(href); if(target){ target.scrollIntoView({behavior:'smooth',block:'start'}) }
          if(window.innerWidth<900){ nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false') }
        }
      })
    })
    // CTA scroll to next section
    document.getElementById('cta-discover').addEventListener('click',e=>{
      e.preventDefault(); document.getElementById('competencies').scrollIntoView({behavior:'smooth'})
    })
  }

  // Hero canvas: subtle moving nodes
  function heroAnimation(){
    const canvas = document.getElementById('hero-canvas'); const ctx = canvas.getContext('2d');
    let w = canvas.width = canvas.clientWidth; let h = canvas.height = canvas.clientHeight;
    const nodes = [];
    for(let i=0;i<30;i++) nodes.push({x:Math.random()*w,y:Math.random()*h, vx:(Math.random()-0.5)*0.2, vy:(Math.random()-0.5)*0.2, r:1+Math.random()*2});
    function resize(){ w=canvas.width=canvas.clientWidth; h=canvas.height=canvas.clientHeight }
    window.addEventListener('resize',resize);
    function tick(){ ctx.clearRect(0,0,w,h);
      // draw connections
      for(let i=0;i<nodes.length;i++){
        const a=nodes[i]; for(let j=i+1;j<nodes.length;j++){ const b=nodes[j]; const dx=a.x-b.x, dy=a.y-b.y; const d= Math.hypot(dx,dy); if(d<120){ ctx.strokeStyle='rgba(11,116,255,'+(0.12*(1-d/120))+')'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke() } }
      }
      // draw nodes
      for(const n of nodes){ ctx.fillStyle='rgba(11,116,255,0.9)'; ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill(); n.x+=n.vx; n.y+=n.vy; if(n.x<0||n.x>w) n.vx*=-1; if(n.y<0||n.y>h) n.vy*=-1 }
      requestAnimationFrame(tick);
    }
    tick();
  }

  // init
  document.addEventListener('DOMContentLoaded',async()=>{
    setupUI(); heroAnimation(); await loadMain(); await loadProjects();
  });

})();
