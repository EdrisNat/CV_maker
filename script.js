(function() {
    // ============================================================
    //  QISMAT CV STUDIO — application logic
    //  Architecture: central state + section registry that drives
    //  the live preview, templates, reordering and visibility.
    // ============================================================

    const $ = id => document.getElementById(id);
    const val = id => { const el = $(id); return el ? el.value : ''; };

    // ---- Photo / canvas state ----
    let profileImage = null;          // Final base64 image for CV
    let cropImage = null;             // Original uploaded image element
    let baseZoom = 1;                 // Zoom that fits the image in the canvas
    let currentZoomMultiplier = 1;    // User zoom relative to base
    let offsetX = 0, offsetY = 0;     // Pan offsets in pixels
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let startOffsetX = 0, startOffsetY = 0;

    const canvas = $('imageCanvas');
    const ctx = canvas.getContext('2d');
    const wrapper = $('canvasWrapper');
    const zoomSlider = $('zoomSlider');
    const zoomIndicator = $('zoomIndicator');

    // ---- Design/config state ----
    let photoShape = 'circle';        // circle | square | none

    // ============================================================
    //  DEFAULT DATA
    // ============================================================
    const defaultData = {
      fullName: "Jane Doe",
      jobTitle: "Senior Software Engineer",
      gender: "Female",
      maritalStatus: "Single",
      nationality: "American",
      contact: {
        email: "jane.doe@example.com",
        phone: "+1 (555) 123-4567",
        location: "New York, USA",
        linkedin: "linkedin.com/in/janedoe",
        website: "janedoe.dev"
      },
      objective: "An enthusiastic and dedicated professional seeking to leverage my skills and experience in a dynamic work environment. Eager to contribute to team success through hard work, attention to detail, and excellent organizational skills.",
      work: [
        {date:"Jan 2022 - Present", role:"Senior Software Engineer", institution:"Tech Solutions Inc., New York", description:"Leading a team of developers to build scalable enterprise applications."},
        {date:"Jun 2019 - Dec 2021", role:"Web Developer", institution:"Creative Digital Agency, Boston", description:"Developed responsive and user-friendly websites for various clients."},
        {date:"Sep 2017 - May 2019", role:"Junior Developer", institution:"StartUp Hub, San Francisco", description:"Assisted in the development of mobile applications using React Native."}
      ],
      education: [
        {date:"Sep 2013 - May 2017", degree:"Bachelor of Science in Computer Science", institution:"University of Technology", extra:"Graduated with Honors. President of the Coding Club."},
        {date:"Sep 2011 - Jun 2013", degree:"High School Diploma", institution:"City High School", extra:"Valedictorian."}
      ],
      skills: [
        {name:"JavaScript", level:"Expert"},
        {name:"React.js", level:"Advanced"},
        {name:"Project Management", level:"Intermediate"}
      ],
      languages: [
        {name:"English", level:"Native"},
        {name:"Spanish", level:"Conversational"}
      ],
      references: [
        {name:"John Smith", contact:"(555) 123-4567", email:"john.smith@example.com", organization:"Tech Solutions Inc."},
        {name:"Sarah Johnson", contact:"(555) 987-6543", email:"sarah.j@example.com", organization:"Creative Digital Agency"}
      ],
      certifications: [
        {name:"AWS Certified Solutions Architect", issuer:"Amazon Web Services", date:"2023"},
        {name:"Professional Scrum Master I", issuer:"Scrum.org", date:"2022"}
      ],
      projects: [
        {name:"Qismat CV Studio", tech:"JavaScript, Canvas API", link:"github.com/jane/qismat", description:"A premium client-side CV builder with live preview and one-click PDF export."}
      ],
      awards: [
        {title:"Employee of the Year", issuer:"Tech Solutions Inc.", date:"2023"}
      ],
      volunteering: [
        {role:"Coding Mentor", organization:"Code for Good", date:"2021 - Present", description:"Mentoring youth in web development fundamentals."}
      ]
    };

    // Live working copies of every list
    const clone = o => JSON.parse(JSON.stringify(o));
    let workItems = clone(defaultData.work);
    let educationItems = clone(defaultData.education);
    let skillItems = clone(defaultData.skills);
    let languageItems = clone(defaultData.languages);
    let referenceItems = clone(defaultData.references);
    let certificationItems = clone(defaultData.certifications);
    let projectItems = clone(defaultData.projects);
    let awardItems = clone(defaultData.awards);
    let volunteeringItems = clone(defaultData.volunteering);

    // Section ordering + visibility (persisted)
    let sectionOrder = ['personal','objective','experience','education','skills','languages','certifications','projects','awards','volunteering','references'];
    let sectionEnabled = {
      personal:true, objective:true, experience:true, education:true, skills:true,
      languages:true, certifications:true, projects:true, awards:true, volunteering:true, references:true
    };

    // ============================================================
    //  THEME COLOR DEFINITIONS
    // ============================================================
    const themes = {
      royal:        { primary:'#1b3b4e', primaryLight:'#3c657b', primaryFade:'#bcd4e6', accent:'#071e2c', border:'#d0deec', textStrong:'#1d4155', textSub:'#284c60', bgSubtle:'#f6fafd' },
      emerald:      { primary:'#1e5a45', primaryLight:'#378c6b', primaryFade:'#bce6d5', accent:'#0f3c2b', border:'#cfe2d8', textStrong:'#1a4e3b', textSub:'#2e6b52', bgSubtle:'#f2fcf7' },
      burgundy:     { primary:'#5f1c24', primaryLight:'#8a2b37', primaryFade:'#e6bcbe', accent:'#3e0c12', border:'#eedadf', textStrong:'#4e141a', textSub:'#70222b', bgSubtle:'#fdf6f7' },
      slate:        { primary:'#4a4a4a', primaryLight:'#737373', primaryFade:'#d9d9d9', accent:'#2c2c2c', border:'#e0e0e0', textStrong:'#3d3d3d', textSub:'#5e5e5e', bgSubtle:'#f7f7f7' },
      classicBlack: { primary:'#000000', primaryLight:'#333333', primaryFade:'#e0e0e0', accent:'#000000', border:'#d4d4d4', textStrong:'#111111', textSub:'#444444', bgSubtle:'#f9f9f9' }
    };

    function applyTheme(themeKey) {
      const theme = themes[themeKey] || themes.royal;
      const root = document.documentElement;
      root.style.setProperty('--theme-primary', theme.primary);
      root.style.setProperty('--theme-primary-light', theme.primaryLight);
      root.style.setProperty('--theme-primary-fade', theme.primaryFade);
      root.style.setProperty('--theme-accent', theme.accent);
      root.style.setProperty('--theme-border', theme.border);
      root.style.setProperty('--theme-text-strong', theme.textStrong);
      root.style.setProperty('--theme-text-sub', theme.textSub);
      root.style.setProperty('--theme-bg-subtle', theme.bgSubtle);
    }

    document.querySelectorAll('input[name="themeColor"]').forEach(radio => {
      radio.addEventListener('change', function(e) {
        applyTheme(e.target.value);
        updateCVPreview();
      });
    });

    // ============================================================
    //  TYPOGRAPHY PAIRINGS
    // ============================================================
    const fontPairings = {
      serif:  { display:"'DM Serif Display', Georgia, serif", body:"'DM Sans', 'Calibri', sans-serif" },
      modern: { display:"'DM Sans', 'Segoe UI', sans-serif",  body:"'DM Sans', 'Calibri', sans-serif" },
      classic:{ display:"Georgia, 'Times New Roman', serif",  body:"'Calibri', 'Segoe UI', sans-serif" }
    };
    function applyFontPairing(key) {
      const p = fontPairings[key] || fontPairings.serif;
      const out = $('cvOutput');
      out.style.setProperty('--cv-display-font', p.display);
      out.style.setProperty('--cv-body-font', p.body);
    }

    // ============================================================
    //  UTILITIES
    // ============================================================
    function escapeHtml(text) {
      return String(text == null ? '' : text).replace(/[&<>"]/g, m =>
        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
    }
    const hasText = v => v && String(v).trim() !== '';

    // Toast notifications (replaces alert)
    let toastContainer = null;
    function toast(message, type = 'info') {
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
      }
      const t = document.createElement('div');
      t.className = 'toast toast-' + type;
      t.textContent = message;
      toastContainer.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 300);
      }, 2800);
    }

    // ============================================================
    //  PHOTO CROP / CANVAS  (unchanged behaviour)
    // ============================================================
    function calculateBaseFitZoom(img) {
      const canvasSize = canvas.width;
      const imgMinDimension = Math.min(img.width, img.height);
      return canvasSize / imgMinDimension;
    }
    function resetToFitView() {
      if (!cropImage) return;
      baseZoom = calculateBaseFitZoom(cropImage);
      currentZoomMultiplier = 1;
      offsetX = 0; offsetY = 0;
      zoomSlider.value = 1;
      updateZoomIndicator();
      drawCanvas();
    }
    function updateZoomIndicator() {
      zoomIndicator.textContent = Math.round(currentZoomMultiplier * 100) + '%';
    }
    function drawCanvas() {
      if (!cropImage) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const imgW = cropImage.width, imgH = cropImage.height;
      const squareSize = Math.min(imgW, imgH);
      const srcX = (imgW - squareSize) / 2;
      const srcY = (imgH - squareSize) / 2;
      const effectiveZoom = baseZoom * currentZoomMultiplier;
      const drawSize = squareSize * effectiveZoom;
      const centerX = canvas.width / 2 + offsetX;
      const centerY = canvas.height / 2 + offsetY;
      ctx.drawImage(cropImage, srcX, srcY, squareSize, squareSize,
        centerX - drawSize / 2, centerY - drawSize / 2, drawSize, drawSize);
    }
    function captureFinalImage() {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 300; tempCanvas.height = 300;
      const tctx = tempCanvas.getContext('2d');
      tctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 300, 300);
      return tempCanvas.toDataURL('image/jpeg', 0.92);
    }

    function startDrag(e) {
      e.preventDefault();
      isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      dragStartX = clientX; dragStartY = clientY;
      startOffsetX = offsetX; startOffsetY = offsetY;
    }
    function onDrag(e) {
      if (!isDragging) return;
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      offsetX = startOffsetX + (clientX - dragStartX);
      offsetY = startOffsetY + (clientY - dragStartY);
      drawCanvas();
    }
    function stopDrag() { isDragging = false; }
    function onWheel(e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.02 : 0.02;
      currentZoomMultiplier = Math.max(0.5, Math.min(3, currentZoomMultiplier + delta));
      zoomSlider.value = currentZoomMultiplier;
      updateZoomIndicator();
      drawCanvas();
    }
    wrapper.addEventListener('mousedown', startDrag);
    wrapper.addEventListener('mousemove', onDrag);
    wrapper.addEventListener('mouseup', stopDrag);
    wrapper.addEventListener('mouseleave', stopDrag);
    wrapper.addEventListener('touchstart', startDrag, {passive: false});
    wrapper.addEventListener('touchmove', onDrag, {passive: false});
    wrapper.addEventListener('touchend', stopDrag);
    wrapper.addEventListener('wheel', onWheel, {passive: false});

    zoomSlider.addEventListener('input', function() {
      currentZoomMultiplier = parseFloat(this.value);
      updateZoomIndicator(); drawCanvas();
    });
    $('zoomInBtn').addEventListener('click', function() {
      currentZoomMultiplier = Math.min(3, currentZoomMultiplier + 0.05);
      zoomSlider.value = currentZoomMultiplier; updateZoomIndicator(); drawCanvas();
    });
    $('zoomOutBtn').addEventListener('click', function() {
      currentZoomMultiplier = Math.max(0.5, currentZoomMultiplier - 0.05);
      zoomSlider.value = currentZoomMultiplier; updateZoomIndicator(); drawCanvas();
    });
    $('resetViewBtn').addEventListener('click', resetToFitView);

    function closeModal() { $('cropModal').style.display = 'none'; }
    $('cancelCropBtn').addEventListener('click', closeModal);
    const altCancel = $('cancelCropBtnAlt');
    if (altCancel) altCancel.addEventListener('click', closeModal);

    $('applyCropBtn').addEventListener('click', function() {
      if (!cropImage) return;
      profileImage = captureFinalImage();
      $('photoPreview').innerHTML = `<img src="${profileImage}" alt="Profile photo">`;
      $('cropModal').style.display = 'none';
      updateCVPreview();
    });
    $('uploadBtn').addEventListener('click', () => $('photoUpload').click());
    $('photoUpload').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        const img = new Image();
        img.onload = function() {
          cropImage = img;
          resetToFitView();
          $('cropModal').style.display = 'flex';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    $('cropBtn').addEventListener('click', function() {
      if (!cropImage) { toast('Please choose an image first.', 'warn'); return; }
      $('cropModal').style.display = 'flex';
    });

    // ============================================================
    //  FORM RENDERERS — existing sections
    // ============================================================
    function renderWorkFields() {
      const container = $('workEntries');
      container.innerHTML = '';
      workItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'reference-entry';
        div.dataset.index = index;
        div.innerHTML = `
          <div class="drag-handle" title="Drag to reorder">☰</div>
          <div class="input-field" style="flex:1 1 180px;"><label>Period</label><input class="work-date" value="${escapeHtml(item.date)}"></div>
          <div class="input-field" style="flex:2 1 200px;"><label>Role</label><input class="work-role" value="${escapeHtml(item.role)}"></div>
          <div class="input-field" style="flex:2 1 200px;"><label>Institution</label><input class="work-institution" value="${escapeHtml(item.institution)}"></div>
          <div class="input-field" style="flex:1 1 100%;"><label>Description</label><textarea class="work-desc" rows="3">${escapeHtml(item.description)}</textarea></div>
          <button type="button" class="btn-outline btn remove-work-btn">✕</button>`;
        container.appendChild(div);
      });
      container.querySelectorAll('.remove-work-btn').forEach(btn => btn.addEventListener('click', e => {
        workItems.splice(parseInt(e.target.closest('.reference-entry').dataset.index), 1);
        renderWorkFields(); updateCVPreview();
      }));
      container.querySelectorAll('.reference-entry').forEach(entry => {
        const idx = parseInt(entry.dataset.index);
        entry.querySelectorAll('input, textarea').forEach(input => input.addEventListener('input', () => {
          workItems[idx] = {
            date: entry.querySelector('.work-date').value,
            role: entry.querySelector('.work-role').value,
            institution: entry.querySelector('.work-institution').value,
            description: entry.querySelector('.work-desc').value
          };
          updateCVPreview();
        }));
      });
    }

    function renderEducationFields() {
      const container = $('educationEntries');
      container.innerHTML = '';
      educationItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'reference-entry';
        div.dataset.index = index;
        div.innerHTML = `
          <div class="drag-handle" title="Drag to reorder">☰</div>
          <div class="input-field" style="flex:1 1 160px;"><label>Date</label><input class="edu-date" value="${escapeHtml(item.date)}"></div>
          <div class="input-field" style="flex:2 1 200px;"><label>Degree</label><input class="edu-degree" value="${escapeHtml(item.degree)}"></div>
          <div class="input-field" style="flex:2 1 200px;"><label>Institution</label><input class="edu-institution" value="${escapeHtml(item.institution)}"></div>
          <div class="input-field" style="flex:1 1 100%;"><label>Extra</label><textarea class="edu-extra" rows="2">${escapeHtml(item.extra || '')}</textarea></div>
          <button type="button" class="btn-outline btn remove-edu-btn">✕</button>`;
        container.appendChild(div);
      });
      container.querySelectorAll('.remove-edu-btn').forEach(btn => btn.addEventListener('click', e => {
        educationItems.splice(parseInt(e.target.closest('.reference-entry').dataset.index), 1);
        renderEducationFields(); updateCVPreview();
      }));
      container.querySelectorAll('.reference-entry').forEach(entry => {
        const idx = parseInt(entry.dataset.index);
        entry.querySelectorAll('input, textarea').forEach(input => input.addEventListener('input', () => {
          educationItems[idx] = {
            date: entry.querySelector('.edu-date').value,
            degree: entry.querySelector('.edu-degree').value,
            institution: entry.querySelector('.edu-institution').value,
            extra: entry.querySelector('.edu-extra').value
          };
          updateCVPreview();
        }));
      });
    }

    function renderReferenceFields() {
      const container = $('referenceEntries');
      container.innerHTML = '';
      referenceItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'reference-entry';
        div.dataset.index = index;
        div.innerHTML = `
          <div class="drag-handle" title="Drag to reorder">☰</div>
          <div class="input-field" style="flex:2 1 180px;"><label>Organization</label><input class="ref-org" value="${escapeHtml(item.organization)}"></div>
          <div class="input-field" style="flex:2 1 180px;"><label>Name</label><input class="ref-name" value="${escapeHtml(item.name)}"></div>
          <div class="input-field" style="flex:1 1 130px;"><label>Contact</label><input class="ref-contact" value="${escapeHtml(item.contact)}"></div>
          <div class="input-field" style="flex:2 1 200px;"><label>Email</label><input class="ref-email" value="${escapeHtml(item.email)}"></div>
          <button type="button" class="btn-outline btn remove-ref-btn">✕</button>`;
        container.appendChild(div);
      });
      container.querySelectorAll('.remove-ref-btn').forEach(btn => btn.addEventListener('click', e => {
        referenceItems.splice(parseInt(e.target.closest('.reference-entry').dataset.index), 1);
        renderReferenceFields(); updateCVPreview();
      }));
      container.querySelectorAll('.reference-entry').forEach(entry => {
        const idx = parseInt(entry.dataset.index);
        entry.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
          referenceItems[idx] = {
            organization: entry.querySelector('.ref-org').value,
            name: entry.querySelector('.ref-name').value,
            contact: entry.querySelector('.ref-contact').value,
            email: entry.querySelector('.ref-email').value
          };
          updateCVPreview();
        }));
      });
    }

    function renderSkillFields() {
      const container = $('skillEntries');
      container.innerHTML = '';
      skillItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'reference-entry';
        div.dataset.index = index;
        div.innerHTML = `
          <div class="drag-handle" title="Drag to reorder">☰</div>
          <div class="input-field" style="flex:2 1 180px;"><label>Skill</label><input class="skill-name" value="${escapeHtml(item.name)}"></div>
          <div class="input-field" style="flex:1 1 130px;"><label>Level (Optional)</label><input class="skill-level-input" value="${escapeHtml(item.level)}" placeholder="e.g. Expert, 5/5"></div>
          <button type="button" class="btn-outline btn remove-skill-btn">✕</button>`;
        container.appendChild(div);
      });
      container.querySelectorAll('.remove-skill-btn').forEach(btn => btn.addEventListener('click', e => {
        skillItems.splice(parseInt(e.target.closest('.reference-entry').dataset.index), 1);
        renderSkillFields(); updateCVPreview();
      }));
      container.querySelectorAll('.reference-entry').forEach(entry => {
        entry.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
          skillItems[parseInt(entry.dataset.index)] = { name: entry.querySelector('.skill-name').value, level: entry.querySelector('.skill-level-input').value };
          updateCVPreview();
        }));
      });
    }

    function renderLanguageFields() {
      const container = $('languageEntries');
      container.innerHTML = '';
      languageItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'reference-entry';
        div.dataset.index = index;
        div.innerHTML = `
          <div class="drag-handle" title="Drag to reorder">☰</div>
          <div class="input-field" style="flex:2 1 180px;"><label>Language</label><input class="lang-name" value="${escapeHtml(item.name)}"></div>
          <div class="input-field" style="flex:1 1 130px;"><label>Proficiency</label><input class="lang-level-input" value="${escapeHtml(item.level)}" placeholder="e.g. Native, Fluent"></div>
          <button type="button" class="btn-outline btn remove-lang-btn">✕</button>`;
        container.appendChild(div);
      });
      container.querySelectorAll('.remove-lang-btn').forEach(btn => btn.addEventListener('click', e => {
        languageItems.splice(parseInt(e.target.closest('.reference-entry').dataset.index), 1);
        renderLanguageFields(); updateCVPreview();
      }));
      container.querySelectorAll('.reference-entry').forEach(entry => {
        entry.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
          languageItems[parseInt(entry.dataset.index)] = { name: entry.querySelector('.lang-name').value, level: entry.querySelector('.lang-level-input').value };
          updateCVPreview();
        }));
      });
    }

    // ============================================================
    //  FORM RENDERERS — new custom sections (schema-driven)
    // ============================================================
    const listConfigs = {
      certifications: {
        container: 'certificationEntries',
        getItems: () => certificationItems,
        blank: () => ({name:'', issuer:'', date:''}),
        fields: [
          {prop:'name',   label:'Certification', flex:'2 1 200px'},
          {prop:'issuer', label:'Issuer',        flex:'2 1 180px'},
          {prop:'date',   label:'Date',          flex:'1 1 110px'}
        ]
      },
      projects: {
        container: 'projectEntries',
        getItems: () => projectItems,
        blank: () => ({name:'', tech:'', link:'', description:''}),
        fields: [
          {prop:'name',        label:'Project',      flex:'2 1 200px'},
          {prop:'tech',        label:'Tech / Role',  flex:'2 1 180px'},
          {prop:'link',        label:'Link',         flex:'1 1 140px'},
          {prop:'description', label:'Description',   flex:'1 1 100%', type:'textarea'}
        ]
      },
      awards: {
        container: 'awardEntries',
        getItems: () => awardItems,
        blank: () => ({title:'', issuer:'', date:''}),
        fields: [
          {prop:'title',  label:'Award',  flex:'2 1 200px'},
          {prop:'issuer', label:'Issuer', flex:'2 1 180px'},
          {prop:'date',   label:'Date',   flex:'1 1 110px'}
        ]
      },
      volunteering: {
        container: 'volunteeringEntries',
        getItems: () => volunteeringItems,
        blank: () => ({role:'', organization:'', date:'', description:''}),
        fields: [
          {prop:'role',        label:'Role',         flex:'2 1 180px'},
          {prop:'organization',label:'Organization', flex:'2 1 180px'},
          {prop:'date',        label:'Date',         flex:'1 1 110px'},
          {prop:'description', label:'Description',   flex:'1 1 100%', type:'textarea'}
        ]
      }
    };

    function renderListForm(key) {
      const cfg = listConfigs[key];
      const container = $(cfg.container);
      if (!container) return;
      const items = cfg.getItems();
      container.innerHTML = '';
      items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'reference-entry';
        div.dataset.index = index;
        let inner = `<div class="drag-handle" title="Drag to reorder">☰</div>`;
        cfg.fields.forEach(f => {
          const control = f.type === 'textarea'
            ? `<textarea class="li-input" data-prop="${f.prop}" rows="2">${escapeHtml(item[f.prop] || '')}</textarea>`
            : `<input class="li-input" data-prop="${f.prop}" value="${escapeHtml(item[f.prop] || '')}">`;
          inner += `<div class="input-field" style="flex:${f.flex};"><label>${f.label}</label>${control}</div>`;
        });
        inner += `<button type="button" class="btn-outline btn li-remove">✕</button>`;
        div.innerHTML = inner;
        container.appendChild(div);
      });
      container.querySelectorAll('.li-remove').forEach(btn => btn.addEventListener('click', e => {
        items.splice(parseInt(e.target.closest('.reference-entry').dataset.index), 1);
        renderListForm(key); updateCVPreview();
      }));
      container.querySelectorAll('.reference-entry').forEach(entry => {
        const idx = parseInt(entry.dataset.index);
        entry.querySelectorAll('.li-input').forEach(input => input.addEventListener('input', () => {
          const obj = {};
          entry.querySelectorAll('.li-input').forEach(el => obj[el.dataset.prop] = el.value);
          items[idx] = obj;
          updateCVPreview();
        }));
      });
    }
    const renderCertificationFields = () => renderListForm('certifications');
    const renderProjectFields = () => renderListForm('projects');
    const renderAwardFields = () => renderListForm('awards');
    const renderVolunteeringFields = () => renderListForm('volunteering');

    // ============================================================
    //  SECTION REGISTRY — drives the CV preview
    //  render() returns an HTML string (or '' when there is nothing
    //  to show).  zone controls sidebar-template placement.
    // ============================================================
    function heading(icon, text) {
      return `<div class="section-heading"><span class="sh-icon">${icon}</span> ${escapeHtml(text)}</div>`;
    }

    function renderPersonal() {
      const details = [
        {label:'Gender', value: val('gender')},
        {label:'Marital Status', value: val('maritalStatus')},
        {label:'Nationality', value: val('nationality')}
      ].filter(d => hasText(d.value));
      if (!details.length) return '';
      let html = heading('🪪', 'Personal Details') + `<div class="details-grid">`;
      details.forEach(d => {
        html += `<div class="detail-item"><span class="detail-label">${escapeHtml(d.label)}</span><span class="detail-value">${escapeHtml(d.value)}</span></div>`;
      });
      return html + `</div>`;
    }

    function renderObjective() {
      const objective = val('objective');
      if (!hasText(objective)) return '';
      return heading('👤', 'Resume Objective') +
        `<div class="objective-text">${escapeHtml(objective).replace(/\n/g, '<br>')}</div>`;
    }

    function renderExperience() {
      const items = workItems.filter(i => hasText(i.role) || hasText(i.institution) || hasText(i.description));
      if (!items.length) return '';
      let html = heading('💼', 'Work Experience');
      items.forEach(item => {
        html += `<div class="experience-item">
          <div class="date-location">${escapeHtml(item.date)}</div>
          <div class="role-title">${escapeHtml(item.role)}</div>
          <div class="institution">${escapeHtml(item.institution)}</div>
          ${hasText(item.description) ? `<div class="desc">${escapeHtml(item.description)}</div>` : ''}
        </div>`;
      });
      return html;
    }

    function renderEducation() {
      const items = educationItems.filter(i => hasText(i.degree) || hasText(i.institution));
      if (!items.length) return '';
      let html = heading('🎓', 'Education');
      items.forEach(item => {
        html += `<div class="education-item">
          <div class="date-location">${escapeHtml(item.date)}</div>
          <div class="degree-title">${escapeHtml(item.degree)}</div>
          <div class="institution">${escapeHtml(item.institution)}</div>
          ${hasText(item.extra) ? `<div class="desc">${escapeHtml(item.extra)}</div>` : ''}
        </div>`;
      });
      return html;
    }

    function renderSkills() {
      const items = skillItems.filter(i => hasText(i.name));
      if (!items.length) return '';
      let html = heading('🛠️', 'Skills') + `<div class="skills-grid">`;
      items.forEach(item => {
        html += `<div class="skill-pill"><strong>${escapeHtml(item.name)}</strong>${hasText(item.level) ? `<span class="skill-level">• ${escapeHtml(item.level)}</span>` : ''}</div>`;
      });
      return html + `</div>`;
    }

    function renderLanguages() {
      const items = languageItems.filter(i => hasText(i.name));
      if (!items.length) return '';
      let html = heading('🌍', 'Languages') + `<div class="skills-grid">`;
      items.forEach(item => {
        html += `<div class="skill-pill"><strong>${escapeHtml(item.name)}</strong>${hasText(item.level) ? `<span class="skill-level">• ${escapeHtml(item.level)}</span>` : ''}</div>`;
      });
      return html + `</div>`;
    }

    function renderCertifications() {
      const items = certificationItems.filter(i => hasText(i.name));
      if (!items.length) return '';
      let html = heading('📜', 'Certifications');
      items.forEach(item => {
        html += `<div class="compact-item">
          <div class="compact-main"><span class="compact-title">${escapeHtml(item.name)}</span>${hasText(item.issuer) ? ` <span class="compact-sub">— ${escapeHtml(item.issuer)}</span>` : ''}</div>
          ${hasText(item.date) ? `<div class="compact-date">${escapeHtml(item.date)}</div>` : ''}
        </div>`;
      });
      return html;
    }

    function renderProjects() {
      const items = projectItems.filter(i => hasText(i.name) || hasText(i.description));
      if (!items.length) return '';
      let html = heading('🚀', 'Projects');
      items.forEach(item => {
        html += `<div class="experience-item">
          <div class="role-title">${escapeHtml(item.name)}${hasText(item.link) ? ` <span class="project-link">${escapeHtml(item.link)}</span>` : ''}</div>
          ${hasText(item.tech) ? `<div class="date-location">${escapeHtml(item.tech)}</div>` : ''}
          ${hasText(item.description) ? `<div class="desc">${escapeHtml(item.description)}</div>` : ''}
        </div>`;
      });
      return html;
    }

    function renderAwards() {
      const items = awardItems.filter(i => hasText(i.title));
      if (!items.length) return '';
      let html = heading('🏆', 'Awards & Honors');
      items.forEach(item => {
        html += `<div class="compact-item">
          <div class="compact-main"><span class="compact-title">${escapeHtml(item.title)}</span>${hasText(item.issuer) ? ` <span class="compact-sub">— ${escapeHtml(item.issuer)}</span>` : ''}</div>
          ${hasText(item.date) ? `<div class="compact-date">${escapeHtml(item.date)}</div>` : ''}
        </div>`;
      });
      return html;
    }

    function renderVolunteering() {
      const items = volunteeringItems.filter(i => hasText(i.role) || hasText(i.organization));
      if (!items.length) return '';
      let html = heading('🤝', 'Volunteering');
      items.forEach(item => {
        html += `<div class="experience-item">
          ${hasText(item.date) ? `<div class="date-location">${escapeHtml(item.date)}</div>` : ''}
          <div class="role-title">${escapeHtml(item.role)}</div>
          <div class="institution">${escapeHtml(item.organization)}</div>
          ${hasText(item.description) ? `<div class="desc">${escapeHtml(item.description)}</div>` : ''}
        </div>`;
      });
      return html;
    }

    function renderReferences() {
      const items = referenceItems.filter(i => hasText(i.name) || hasText(i.organization));
      if (!items.length) return '';
      let html = heading('📇', 'References') + `<div class="reference-grid">`;
      items.forEach(ref => {
        html += `<div class="ref-item">
          <strong class="ref-org-name">${escapeHtml(ref.organization)}</strong>
          <span class="ref-person">${escapeHtml(ref.name)}</span>
          ${hasText(ref.contact) ? `<span class="ref-line">📞 ${escapeHtml(ref.contact)}</span>` : ''}
          ${hasText(ref.email) ? `<span class="ref-line">✉️ ${escapeHtml(ref.email)}</span>` : ''}
        </div>`;
      });
      return html + `</div>`;
    }

    const SECTIONS = {
      personal:       { label:'Personal Details', zone:'side', render:renderPersonal },
      objective:      { label:'Objective',        zone:'main', render:renderObjective },
      experience:     { label:'Work Experience',  zone:'main', render:renderExperience },
      education:      { label:'Education',         zone:'main', render:renderEducation },
      skills:         { label:'Skills',           zone:'side', render:renderSkills },
      languages:      { label:'Languages',        zone:'side', render:renderLanguages },
      certifications: { label:'Certifications',   zone:'main', render:renderCertifications },
      projects:       { label:'Projects',         zone:'main', render:renderProjects },
      awards:         { label:'Awards & Honors',  zone:'main', render:renderAwards },
      volunteering:   { label:'Volunteering',     zone:'main', render:renderVolunteering },
      references:     { label:'References',        zone:'main', render:renderReferences }
    };

    // Contact + name blocks (shared between templates)
    function renderContact() {
      const c = {
        email: val('contactEmail'), phone: val('contactPhone'), location: val('contactLocation'),
        linkedin: val('contactLinkedin'), website: val('contactWebsite')
      };
      const parts = [];
      if (hasText(c.email))    parts.push(`<span class="contact-chip"><span class="ci">✉️</span>${escapeHtml(c.email)}</span>`);
      if (hasText(c.phone))    parts.push(`<span class="contact-chip"><span class="ci">📞</span>${escapeHtml(c.phone)}</span>`);
      if (hasText(c.location)) parts.push(`<span class="contact-chip"><span class="ci">📍</span>${escapeHtml(c.location)}</span>`);
      if (hasText(c.linkedin)) parts.push(`<span class="contact-chip"><span class="ci">in</span>${escapeHtml(c.linkedin)}</span>`);
      if (hasText(c.website))  parts.push(`<span class="contact-chip"><span class="ci">🌐</span>${escapeHtml(c.website)}</span>`);
      if (!parts.length) return '';
      return `<div class="cv-contact">${parts.join('')}</div>`;
    }

    function renderPhoto() {
      if (!profileImage || photoShape === 'none' || $('atsMode')?.checked) return '';
      return `<img src="${profileImage}" class="cv-photo shape-${photoShape}" alt="Profile">`;
    }

    function renderNameBlock(withContact) {
      const fullName = val('fullName') || 'Your Name';
      const jobTitle = val('jobTitle');
      return `<div class="cv-name-section">
        <h1>${escapeHtml(fullName)}</h1>
        ${hasText(jobTitle) ? `<div class="cv-jobtitle">${escapeHtml(jobTitle)}</div>` : `<div class="cv-subtitle">Curriculum Vitae</div>`}
        ${withContact ? renderContact() : ''}
      </div>`;
    }

    // ============================================================
    //  CV PREVIEW (template-aware)
    // ============================================================
    function currentTemplate() {
      return document.querySelector('input[name="template"]:checked')?.value || 'classic';
    }

    function updateCVPreview() {
      const out = $('cvOutput');
      const template = currentTemplate();
      const ats = $('atsMode')?.checked;

      out.className = 'cv-preview template-' + template + (ats ? ' ats-mode' : '');

      const enabledInOrder = sectionOrder.filter(id => SECTIONS[id] && sectionEnabled[id]);
      let html = '';

      if (template === 'sidebar') {
        const sideIds = enabledInOrder.filter(id => SECTIONS[id].zone === 'side');
        const mainIds = enabledInOrder.filter(id => SECTIONS[id].zone === 'main');
        const sideBody = sideIds.map(id => SECTIONS[id].render()).filter(Boolean).join('');
        const mainBody = mainIds.map(id => SECTIONS[id].render()).filter(Boolean).join('');
        html += `<div class="cv-sidebar">
            ${renderPhoto()}
            ${renderContact()}
            ${sideBody}
          </div>
          <div class="cv-main">
            <div class="cv-header cv-header-main">${renderNameBlock(false)}</div>
            ${mainBody}
          </div>`;
      } else {
        html += `<div class="cv-header">${renderPhoto()}${renderNameBlock(true)}</div>`;
        html += enabledInOrder.map(id => SECTIONS[id].render()).filter(Boolean).join('');
      }

      html += `<div class="cv-actions"><button type="button" class="download-btn" id="downloadPdfBtn">📥 Download as PDF</button></div>`;

      out.innerHTML = html;
      $('downloadPdfBtn').addEventListener('click', downloadCVAsPDF);

      applyFontPairing(val('fontPairing') || 'serif');
      updateCompleteness();
      saveCurrentState();
    }

    // ============================================================
    //  COMPLETENESS METER
    // ============================================================
    function updateCompleteness() {
      const checks = [
        { ok: hasText(val('fullName')), tip: 'Add your full name' },
        { ok: hasText(val('jobTitle')), tip: 'Add a professional title' },
        { ok: hasText(val('objective')) && val('objective').trim().length > 40, tip: 'Expand your objective (40+ chars)' },
        { ok: hasText(val('contactEmail')) || hasText(val('contactPhone')), tip: 'Add an email or phone' },
        { ok: hasText(val('contactLocation')), tip: 'Add your location' },
        { ok: !!profileImage, tip: 'Upload a profile photo' },
        { ok: workItems.some(w => hasText(w.role)), tip: 'Add work experience' },
        { ok: educationItems.some(e => hasText(e.degree)), tip: 'Add education' },
        { ok: skillItems.some(s => hasText(s.name)), tip: 'List some skills' },
        { ok: languageItems.some(l => hasText(l.name)), tip: 'Add languages' },
        { ok: referenceItems.some(r => hasText(r.name)), tip: 'Add a reference' },
        { ok: [certificationItems, projectItems, awardItems, volunteeringItems].some(a => a.length), tip: 'Add certifications or projects' }
      ];
      const done = checks.filter(c => c.ok).length;
      const pct = Math.round((done / checks.length) * 100);
      const fill = $('completenessFill'), pctEl = $('completenessPct'), hintEl = $('completenessHint');
      if (fill) fill.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
      if (fill) {
        fill.classList.toggle('is-low', pct < 40);
        fill.classList.toggle('is-mid', pct >= 40 && pct < 80);
        fill.classList.toggle('is-high', pct >= 80);
      }
      if (hintEl) {
        const next = checks.find(c => !c.ok);
        hintEl.textContent = pct === 100 ? '✓ Your CV looks complete — nicely done!' : (next ? 'Next: ' + next.tip : '');
      }
    }

    // ============================================================
    //  PDF EXPORT (multi-page aware)
    // ============================================================
    function downloadCVAsPDF() {
      const fullName = val('fullName') || 'CV';
      const cvElement = $('cvOutput');
      const actions = cvElement.querySelector('.cv-actions');
      if (actions) actions.style.display = 'none';

      const state = {
        boxShadow: cvElement.style.boxShadow, borderRadius: cvElement.style.borderRadius,
        maxWidth: cvElement.style.maxWidth, margin: cvElement.style.margin, transform: cvElement.style.transform
      };
      cvElement.style.boxShadow = 'none';
      cvElement.style.borderRadius = '0';
      cvElement.style.maxWidth = '100%';
      cvElement.style.margin = '0 auto';
      cvElement.style.transform = 'none';

      const opt = {
        margin:      [8, 8, 10, 8],
        filename:    `${fullName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_CV.pdf`,
        image:       { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0, windowWidth: document.documentElement.offsetWidth },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // Allow content to flow across multiple A4 pages, but never split
        // an individual entry across a page boundary.
        pagebreak:   { mode: ['css', 'legacy'], avoid: ['.experience-item', '.education-item', '.ref-item', '.detail-item', '.skill-pill', '.compact-item', '.section-heading'] }
      };

      const restore = () => {
        cvElement.style.boxShadow = state.boxShadow;
        cvElement.style.borderRadius = state.borderRadius;
        cvElement.style.maxWidth = state.maxWidth;
        cvElement.style.margin = state.margin;
        cvElement.style.transform = state.transform;
        if (actions) actions.style.display = 'flex';
      };

      html2pdf().set(opt).from(cvElement).save()
        .then(() => { restore(); toast('PDF downloaded ✓', 'success'); })
        .catch(err => { console.error('PDF generation error:', err); restore(); toast('Error generating PDF. Please try again.', 'warn'); });
    }

    // ============================================================
    //  SECTION MANAGER (visibility + reordering)
    // ============================================================
    function renderSectionManager() {
      const container = $('sectionManager');
      if (!container) return;
      container.innerHTML = '';
      sectionOrder.forEach((id, index) => {
        if (!SECTIONS[id]) return;
        const row = document.createElement('div');
        row.className = 'section-row';
        row.dataset.section = id;
        row.dataset.index = index;
        row.draggable = false;
        row.innerHTML = `
          <span class="section-drag" title="Drag to reorder">☰</span>
          <span class="section-name">${escapeHtml(SECTIONS[id].label)}</span>
          <label class="switch mini">
            <input type="checkbox" class="section-toggle" ${sectionEnabled[id] ? 'checked' : ''}>
            <span class="switch-track"><span class="switch-thumb"></span></span>
          </label>`;
        container.appendChild(row);
      });
      container.querySelectorAll('.section-toggle').forEach(cb => cb.addEventListener('change', e => {
        const id = e.target.closest('.section-row').dataset.section;
        sectionEnabled[id] = e.target.checked;
        updateCVPreview();
      }));
    }

    // Dedicated drag-reorder for the section manager rows
    (function initSectionManagerDnD() {
      const container = $('sectionManager');
      if (!container) return;
      let dragRow = null;
      container.addEventListener('mousedown', e => {
        if (e.target.classList.contains('section-drag')) e.target.closest('.section-row').draggable = true;
      });
      container.addEventListener('dragstart', e => {
        const row = e.target.closest('.section-row');
        if (!row) return;
        dragRow = row; row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      container.addEventListener('dragover', e => {
        e.preventDefault();
        const target = e.target.closest('.section-row');
        if (!target || target === dragRow) return;
        const rect = target.getBoundingClientRect();
        const after = e.clientY > rect.top + rect.height / 2;
        container.querySelectorAll('.section-row').forEach(r => { r.style.borderTop = ''; r.style.borderBottom = ''; });
        target.style[after ? 'borderBottom' : 'borderTop'] = '2px solid var(--theme-primary)';
      });
      container.addEventListener('drop', e => {
        e.preventDefault();
        const target = e.target.closest('.section-row');
        container.querySelectorAll('.section-row').forEach(r => { r.style.borderTop = ''; r.style.borderBottom = ''; });
        if (!target || !dragRow || target === dragRow) return;
        const from = parseInt(dragRow.dataset.index);
        const to = parseInt(target.dataset.index);
        const rect = target.getBoundingClientRect();
        let insert = e.clientY > rect.top + rect.height / 2 ? to + 1 : to;
        if (from < insert) insert--;
        const moved = sectionOrder.splice(from, 1)[0];
        sectionOrder.splice(insert, 0, moved);
        renderSectionManager();
        updateCVPreview();
      });
      container.addEventListener('dragend', () => {
        if (dragRow) { dragRow.classList.remove('dragging'); dragRow.draggable = false; }
        dragRow = null;
      });
    })();

    // ============================================================
    //  DESIGN CONTROLS (template / font / photo shape / ATS)
    // ============================================================
    document.querySelectorAll('input[name="template"]').forEach(r => r.addEventListener('change', updateCVPreview));
    $('fontPairing').addEventListener('change', updateCVPreview);
    $('atsMode').addEventListener('change', updateCVPreview);
    $('photoShapeGroup').querySelectorAll('.segmented-btn').forEach(btn => btn.addEventListener('click', function() {
      $('photoShapeGroup').querySelectorAll('.segmented-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      photoShape = this.dataset.shape;
      updateCVPreview();
    }));

    // ============================================================
    //  MAIN FORM EVENTS
    // ============================================================
    ['fullName','jobTitle','objective','nationality',
     'contactEmail','contactPhone','contactLocation','contactLinkedin','contactWebsite']
      .forEach(id => { const el = $(id); if (el) el.addEventListener('input', updateCVPreview); });
    ['gender','maritalStatus'].forEach(id => { const el = $(id); if (el) el.addEventListener('change', updateCVPreview); });

    $('addWorkBtn').addEventListener('click', () => { workItems.push({date:'',role:'',institution:'',description:''}); renderWorkFields(); });
    $('addEducationBtn').addEventListener('click', () => { educationItems.push({date:'',degree:'',institution:'',extra:''}); renderEducationFields(); });
    $('addSkillBtn').addEventListener('click', () => { skillItems.push({name:'',level:''}); renderSkillFields(); });
    $('addLanguageBtn').addEventListener('click', () => { languageItems.push({name:'',level:''}); renderLanguageFields(); });
    $('addReferenceBtn').addEventListener('click', () => { referenceItems.push({organization:'',name:'',contact:'',email:''}); renderReferenceFields(); });
    $('addCertificationBtn').addEventListener('click', () => { certificationItems.push(listConfigs.certifications.blank()); renderCertificationFields(); });
    $('addProjectBtn').addEventListener('click', () => { projectItems.push(listConfigs.projects.blank()); renderProjectFields(); });
    $('addAwardBtn').addEventListener('click', () => { awardItems.push(listConfigs.awards.blank()); renderAwardFields(); });
    $('addVolunteeringBtn').addEventListener('click', () => { volunteeringItems.push(listConfigs.volunteering.blank()); renderVolunteeringFields(); });

    function renderAllForms() {
      renderWorkFields(); renderEducationFields(); renderSkillFields(); renderLanguageFields();
      renderReferenceFields(); renderCertificationFields(); renderProjectFields();
      renderAwardFields(); renderVolunteeringFields(); renderSectionManager();
    }

    $('resetDefaultBtn').addEventListener('click', function() {
      applyState(buildStateFrom(defaultData, {
        theme: 'royal', template: 'classic', fontPairing: 'serif', photoShape: 'circle', atsMode: false,
        sectionOrder: ['personal','objective','experience','education','skills','languages','certifications','projects','awards','volunteering','references'],
        sectionEnabled: { personal:true, objective:true, experience:true, education:true, skills:true, languages:true, certifications:true, projects:true, awards:true, volunteering:true, references:true },
        profileImage: null
      }));
      $('photoPreview').innerHTML = `<div class="preview-placeholder"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>`;
      cropImage = null;
      toast('Reset to default', 'info');
    });

    // No submit button — the preview updates live. This only guards against
    // an accidental page reload if Enter is pressed inside a field.
    $('cvForm').addEventListener('submit', e => e.preventDefault());

    // ============================================================
    //  DRAG & DROP REORDERING — form entry rows
    // ============================================================
    const containerToList = {
      workEntries:          () => ({ arr: workItems,          render: renderWorkFields }),
      educationEntries:     () => ({ arr: educationItems,     render: renderEducationFields }),
      skillEntries:         () => ({ arr: skillItems,         render: renderSkillFields }),
      languageEntries:      () => ({ arr: languageItems,      render: renderLanguageFields }),
      referenceEntries:     () => ({ arr: referenceItems,     render: renderReferenceFields }),
      certificationEntries: () => ({ arr: certificationItems, render: renderCertificationFields }),
      projectEntries:       () => ({ arr: projectItems,       render: renderProjectFields }),
      awardEntries:         () => ({ arr: awardItems,         render: renderAwardFields }),
      volunteeringEntries:  () => ({ arr: volunteeringItems,  render: renderVolunteeringFields })
    };

    let draggedElement = null, draggedArray = null, draggedRenderFn = null;

    document.addEventListener('mousedown', e => {
      if (e.target.classList.contains('drag-handle')) e.target.closest('.reference-entry').draggable = true;
    });
    document.addEventListener('mouseup', e => {
      if (e.target.classList.contains('drag-handle')) {
        const entry = e.target.closest('.reference-entry');
        if (entry) entry.draggable = false;
      }
    });
    document.addEventListener('dragstart', e => {
      const entry = e.target.closest('.reference-entry');
      if (!entry) return;
      draggedElement = entry;
      entry.classList.add('dragging');
      const resolver = containerToList[entry.parentElement.id];
      if (resolver) { const r = resolver(); draggedArray = r.arr; draggedRenderFn = r.render; }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', entry.dataset.index);
    });
    document.addEventListener('dragover', e => {
      const targetEntry = e.target.closest('.reference-entry');
      if (!draggedElement || !targetEntry) return;
      e.preventDefault();
      if (targetEntry !== draggedElement && targetEntry.parentElement === draggedElement.parentElement) {
        const rect = targetEntry.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        targetEntry.style.borderTop = e.clientY < midY ? '2px solid var(--theme-primary)' : '';
        targetEntry.style.borderBottom = e.clientY >= midY ? '2px solid var(--theme-primary)' : '';
      }
    });
    document.addEventListener('dragleave', e => {
      const targetEntry = e.target.closest('.reference-entry');
      if (targetEntry) { targetEntry.style.borderTop = ''; targetEntry.style.borderBottom = ''; }
    });
    document.addEventListener('drop', e => {
      const targetEntry = e.target.closest('.reference-entry');
      if (targetEntry) { targetEntry.style.borderTop = ''; targetEntry.style.borderBottom = ''; }
      if (!targetEntry || !draggedElement || targetEntry === draggedElement || !draggedArray) return;
      if (targetEntry.parentElement !== draggedElement.parentElement) return;
      e.preventDefault();
      const fromIndex = parseInt(draggedElement.dataset.index);
      const toIndex = parseInt(targetEntry.dataset.index);
      const rect = targetEntry.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      let insertIndex = e.clientY >= midY ? toIndex + 1 : toIndex;
      if (fromIndex < insertIndex) insertIndex--;
      const item = draggedArray.splice(fromIndex, 1)[0];
      draggedArray.splice(insertIndex, 0, item);
      draggedRenderFn();
      updateCVPreview();
    });
    document.addEventListener('dragend', () => {
      if (draggedElement) { draggedElement.classList.remove('dragging'); draggedElement.draggable = false; }
      draggedElement = null; draggedArray = null; draggedRenderFn = null;
    });

    // ============================================================
    //  STATE — gather / apply / persist / import / export / share
    // ============================================================
    function gatherState() {
      return {
        fullName: val('fullName'), jobTitle: val('jobTitle'),
        gender: val('gender'), maritalStatus: val('maritalStatus'), nationality: val('nationality'),
        contact: {
          email: val('contactEmail'), phone: val('contactPhone'), location: val('contactLocation'),
          linkedin: val('contactLinkedin'), website: val('contactWebsite')
        },
        objective: val('objective'),
        work: workItems, education: educationItems, skills: skillItems, languages: languageItems,
        references: referenceItems, certifications: certificationItems, projects: projectItems,
        awards: awardItems, volunteering: volunteeringItems,
        theme: document.querySelector('input[name="themeColor"]:checked')?.value || 'royal',
        template: currentTemplate(),
        fontPairing: val('fontPairing'),
        photoShape: photoShape,
        atsMode: $('atsMode')?.checked || false,
        sectionOrder: sectionOrder.slice(),
        sectionEnabled: Object.assign({}, sectionEnabled),
        profileImage: profileImage
      };
    }

    // Normalise arbitrary data (defaults or imported) into a full state object
    function buildStateFrom(data, overrides) {
      const base = {
        fullName: data.fullName || '', jobTitle: data.jobTitle || '',
        gender: data.gender || '', maritalStatus: data.maritalStatus || '', nationality: data.nationality || '',
        contact: Object.assign({email:'',phone:'',location:'',linkedin:'',website:''}, data.contact || {}),
        objective: data.objective || '',
        work: clone(data.work || []), education: clone(data.education || []),
        skills: clone(data.skills || []), languages: clone(data.languages || []),
        references: clone(data.references || []), certifications: clone(data.certifications || []),
        projects: clone(data.projects || []), awards: clone(data.awards || []),
        volunteering: clone(data.volunteering || []),
        theme: data.theme || 'royal', template: data.template || 'classic',
        fontPairing: data.fontPairing || 'serif', photoShape: data.photoShape || 'circle',
        atsMode: !!data.atsMode,
        sectionOrder: (data.sectionOrder && data.sectionOrder.length) ? data.sectionOrder.slice() : sectionOrder.slice(),
        sectionEnabled: Object.assign({}, sectionEnabled, data.sectionEnabled || {}),
        profileImage: data.profileImage || null
      };
      return Object.assign(base, overrides || {});
    }

    function setValue(id, v) { const el = $(id); if (el != null && v != null) el.value = v; }
    function setChecked(id, v) { const el = $(id); if (el) el.checked = !!v; }

    function applyState(s) {
      setValue('fullName', s.fullName); setValue('jobTitle', s.jobTitle);
      setValue('gender', s.gender); setValue('maritalStatus', s.maritalStatus); setValue('nationality', s.nationality);
      const c = s.contact || {};
      setValue('contactEmail', c.email); setValue('contactPhone', c.phone); setValue('contactLocation', c.location);
      setValue('contactLinkedin', c.linkedin); setValue('contactWebsite', c.website);
      setValue('objective', s.objective);

      workItems = clone(s.work || []);
      educationItems = clone(s.education || []);
      skillItems = clone(s.skills || []);
      languageItems = clone(s.languages || []);
      referenceItems = clone(s.references || []);
      certificationItems = clone(s.certifications || []);
      projectItems = clone(s.projects || []);
      awardItems = clone(s.awards || []);
      volunteeringItems = clone(s.volunteering || []);

      if (s.sectionOrder && s.sectionOrder.length) {
        // keep known ids, append any that were missing
        const known = s.sectionOrder.filter(id => SECTIONS[id]);
        Object.keys(SECTIONS).forEach(id => { if (!known.includes(id)) known.push(id); });
        sectionOrder = known;
      }
      if (s.sectionEnabled) sectionEnabled = Object.assign({}, sectionEnabled, s.sectionEnabled);

      // theme
      const themeRadio = document.querySelector(`input[name="themeColor"][value="${s.theme || 'royal'}"]`);
      if (themeRadio) { themeRadio.checked = true; applyTheme(s.theme || 'royal'); }
      // template
      const tplRadio = document.querySelector(`input[name="template"][value="${s.template || 'classic'}"]`);
      if (tplRadio) tplRadio.checked = true;
      // font
      setValue('fontPairing', s.fontPairing || 'serif');
      // photo shape
      photoShape = s.photoShape || 'circle';
      $('photoShapeGroup').querySelectorAll('.segmented-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.shape === photoShape));
      // ats
      setChecked('atsMode', s.atsMode);
      // photo
      profileImage = s.profileImage || null;
      $('photoPreview').innerHTML = profileImage
        ? `<img src="${profileImage}" alt="Profile photo">`
        : `<div class="preview-placeholder"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>`;

      renderAllForms();
      updateCVPreview();
    }

    function saveCurrentState() {
      try { localStorage.setItem('qismatCVState', JSON.stringify(gatherState())); }
      catch (e) { console.warn('Failed to save state', e); }
    }

    function loadSavedState() {
      try {
        const saved = localStorage.getItem('qismatCVState');
        if (!saved) return false;
        applyState(buildStateFrom(JSON.parse(saved)));
        return true;
      } catch (e) { console.warn('Failed to load state', e); return false; }
    }

    // ---- Export / Import / Share ----
    $('exportJsonBtn').addEventListener('click', function() {
      const data = JSON.stringify(gatherState(), null, 2);
      const blob = new Blob([data], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const name = (val('fullName') || 'cv').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.href = url; a.download = `${name}_qismat.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast('CV data exported ✓', 'success');
    });

    $('importJsonBtn').addEventListener('click', () => $('importJsonInput').click());
    $('importJsonInput').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        try {
          const data = JSON.parse(ev.target.result);
          applyState(buildStateFrom(data));
          toast('CV data imported ✓', 'success');
        } catch (err) {
          console.error(err);
          toast('Could not read that file — is it a valid Qismat export?', 'warn');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    function encodeState(obj) {
      return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    }
    function decodeState(str) {
      return JSON.parse(decodeURIComponent(escape(atob(str))));
    }

    $('shareLinkBtn').addEventListener('click', function() {
      // Photos are omitted from links to keep the URL usable.
      const s = gatherState();
      delete s.profileImage;
      let encoded;
      try { encoded = encodeState(s); }
      catch (err) { toast('Could not build a share link.', 'warn'); return; }
      const link = location.origin + location.pathname + '#cv=' + encoded;
      const finish = ok => toast(ok ? 'Share link copied to clipboard ✓ (photo not included)' : 'Copy failed — link is in the address bar', ok ? 'success' : 'warn');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => finish(true)).catch(() => { location.hash = 'cv=' + encoded; finish(false); });
      } else {
        location.hash = 'cv=' + encoded; finish(false);
      }
    });

    function loadFromHash() {
      const m = location.hash.match(/cv=([^&]+)/);
      if (!m) return false;
      try {
        const data = decodeState(m[1]);
        applyState(buildStateFrom(data));
        toast('Loaded CV from shared link', 'info');
        return true;
      } catch (e) { console.warn('Bad share link', e); return false; }
    }

    // ============================================================
    //  LIGHT / DARK MODE TOGGLE
    // ============================================================
    (function() {
      const btn = $('themeToggleBtn');
      if (!btn) return;
      if (localStorage.getItem('qismatColorMode') === 'light') document.body.classList.add('light-mode');
      btn.addEventListener('click', function() {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem('qismatColorMode', isLight ? 'light' : 'dark');
      });
    })();

    // ============================================================
    //  INITIALISE
    // ============================================================
    if (!loadFromHash()) {
      loadSavedState();
    }
    // Support pasting a share link while already on the page
    window.addEventListener('hashchange', loadFromHash);
    renderAllForms();
    updateCVPreview();
  })();
