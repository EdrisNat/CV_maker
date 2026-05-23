(function() {
    // Application state
    let profileImage = null; // Final base64 image for CV
    let cropImage = null; // Original uploaded image element
    let baseZoom = 1; // The calculated zoom level that fits the image in canvas (1 = perfect fit)
    let currentZoomMultiplier = 1; // User's zoom multiplier relative to base zoom
    let offsetX = 0, offsetY = 0; // Pan offsets in pixels
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let startOffsetX = 0, startOffsetY = 0;

    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const wrapper = document.getElementById('canvasWrapper');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomIndicator = document.getElementById('zoomIndicator');

    // Default data for CV
    const defaultData = {
      fullName: "Jane Doe",
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
      ]
    };

    let workItems = JSON.parse(JSON.stringify(defaultData.work));
    let educationItems = JSON.parse(JSON.stringify(defaultData.education));
    let skillItems = JSON.parse(JSON.stringify(defaultData.skills));
    let languageItems = JSON.parse(JSON.stringify(defaultData.languages));
    let referenceItems = JSON.parse(JSON.stringify(defaultData.references));

    // Theme definitions
    const themes = {
      royal: {
        primary: '#1b3b4e',
        primaryLight: '#3c657b',
        primaryFade: '#bcd4e6',
        accent: '#071e2c',
        border: '#d0deec',
        textStrong: '#1d4155',
        textSub: '#284c60',
        bgSubtle: '#f6fafd'
      },
      emerald: {
        primary: '#1e5a45',
        primaryLight: '#378c6b',
        primaryFade: '#bce6d5',
        accent: '#0f3c2b',
        border: '#cfe2d8',
        textStrong: '#1a4e3b',
        textSub: '#2e6b52',
        bgSubtle: '#f2fcf7'
      },
      burgundy: {
        primary: '#5f1c24',
        primaryLight: '#8a2b37',
        primaryFade: '#e6bcbe',
        accent: '#3e0c12',
        border: '#eedadf',
        textStrong: '#4e141a',
        textSub: '#70222b',
        bgSubtle: '#fdf6f7'
      },
      slate: {
        primary: '#4a4a4a',
        primaryLight: '#737373',
        primaryFade: '#d9d9d9',
        accent: '#2c2c2c',
        border: '#e0e0e0',
        textStrong: '#3d3d3d',
        textSub: '#5e5e5e',
        bgSubtle: '#f7f7f7'
      },
      classicBlack: {
        primary: '#000000',
        primaryLight: '#333333',
        primaryFade: '#e0e0e0',
        accent: '#000000',
        border: '#d4d4d4',
        textStrong: '#111111',
        textSub: '#444444',
        bgSubtle: '#f9f9f9'
      }
    };

    /**
     * Apply selected color theme to the CSS custom properties
     */
    function applyTheme(themeKey) {
      const theme = themes[themeKey];
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

    // Bind theme change events
    document.querySelectorAll('input[name="themeColor"]').forEach(radio => {
      radio.addEventListener('change', function(e) {
        applyTheme(e.target.value);
        if (typeof saveCurrentState === 'function') saveCurrentState();
      });
    });

    /**
     * Calculate the base zoom level that fits the image perfectly within the canvas.
     * This ensures the image starts at a natural "fit" view.
     * @param {HTMLImageElement} img - The source image.
     * @returns {number} - The zoom factor where 1.0 = image fits exactly in canvas.
     */
    function calculateBaseFitZoom(img) {
      const canvasSize = canvas.width; // 400x400 square
      const imgMinDimension = Math.min(img.width, img.height);
      // The base zoom makes the image's smallest dimension fill the canvas
      return canvasSize / imgMinDimension;
    }

    /**
     * Reset the view to default fit state.
     */
    function resetToFitView() {
      if (!cropImage) return;
      baseZoom = calculateBaseFitZoom(cropImage);
      currentZoomMultiplier = 1;
      offsetX = 0;
      offsetY = 0;
      zoomSlider.value = 1;
      updateZoomIndicator();
      drawCanvas();
    }

    /**
     * Update the zoom percentage indicator.
     */
    function updateZoomIndicator() {
      const percentage = Math.round(currentZoomMultiplier * 100);
      zoomIndicator.textContent = percentage + '%';
    }

    /**
     * Main draw function - renders the image with proper zoom and pan.
     */
    function drawCanvas() {
      if (!cropImage) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const imgW = cropImage.width;
      const imgH = cropImage.height;
      
      // We crop the image to a square (centered)
      const squareSize = Math.min(imgW, imgH);
      const srcX = (imgW - squareSize) / 2;
      const srcY = (imgH - squareSize) / 2;
      
      // Calculate the actual zoom level
      const effectiveZoom = baseZoom * currentZoomMultiplier;
      const drawSize = squareSize * effectiveZoom;
      
      // Center the image in canvas, then apply user pan offset
      const centerX = canvas.width / 2 + offsetX;
      const centerY = canvas.height / 2 + offsetY;
      const destX = centerX - drawSize / 2;
      const destY = centerY - drawSize / 2;
      
      // Draw the image
      ctx.drawImage(
        cropImage,
        srcX, srcY, squareSize, squareSize,
        destX, destY, drawSize, drawSize
      );
    }

    /**
     * Capture the current canvas view as the final profile image.
     */
    function captureFinalImage() {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 300;
      tempCanvas.height = 300;
      const tctx = tempCanvas.getContext('2d');
      
      // Simply draw the current canvas (which shows the adjusted view) scaled to 300x300
      tctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 300, 300);
      return tempCanvas.toDataURL('image/jpeg', 0.92);
    }

    // ---- Drag & Pan Handlers ----
    function startDrag(e) {
      e.preventDefault();
      isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      dragStartX = clientX;
      dragStartY = clientY;
      startOffsetX = offsetX;
      startOffsetY = offsetY;
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

    function stopDrag() {
      isDragging = false;
    }

    function onWheel(e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.02 : 0.02;
      currentZoomMultiplier = Math.max(0.5, Math.min(3, currentZoomMultiplier + delta));
      zoomSlider.value = currentZoomMultiplier;
      updateZoomIndicator();
      drawCanvas();
    }

    // Attach event listeners to wrapper
    wrapper.addEventListener('mousedown', startDrag);
    wrapper.addEventListener('mousemove', onDrag);
    wrapper.addEventListener('mouseup', stopDrag);
    wrapper.addEventListener('mouseleave', stopDrag);
    wrapper.addEventListener('touchstart', startDrag, {passive: false});
    wrapper.addEventListener('touchmove', onDrag, {passive: false});
    wrapper.addEventListener('touchend', stopDrag);
    wrapper.addEventListener('wheel', onWheel, {passive: false});

    // Zoom slider control
    zoomSlider.addEventListener('input', function() {
      currentZoomMultiplier = parseFloat(this.value);
      updateZoomIndicator();
      drawCanvas();
    });

    // Zoom buttons
    document.getElementById('zoomInBtn').addEventListener('click', function() {
      currentZoomMultiplier = Math.min(3, currentZoomMultiplier + 0.05);
      zoomSlider.value = currentZoomMultiplier;
      updateZoomIndicator();
      drawCanvas();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', function() {
      currentZoomMultiplier = Math.max(0.5, currentZoomMultiplier - 0.05);
      zoomSlider.value = currentZoomMultiplier;
      updateZoomIndicator();
      drawCanvas();
    });

    // Reset view button
    document.getElementById('resetViewBtn').addEventListener('click', resetToFitView);

    // Modal controls
    document.getElementById('cancelCropBtn').addEventListener('click', function() {
      document.getElementById('cropModal').style.display = 'none';
    });

    document.getElementById('applyCropBtn').addEventListener('click', function() {
      if (!cropImage) return;
      profileImage = captureFinalImage();
      document.getElementById('photoPreview').innerHTML = `<img src="${profileImage}" alt="Profile photo">`;
      document.getElementById('cropModal').style.display = 'none';
      updateCVPreview();
    });

    // Upload handlers
    document.getElementById('uploadBtn').addEventListener('click', function() {
      document.getElementById('photoUpload').click();
    });

    document.getElementById('photoUpload').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(ev) {
        const img = new Image();
        img.onload = function() {
          // Set the crop image
          cropImage = img;
          // Calculate base fit zoom and reset all adjustments
          resetToFitView();
          // Show the modal
          document.getElementById('cropModal').style.display = 'flex';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('cropBtn').addEventListener('click', function() {
      if (!cropImage) {
        alert('Please upload an image first.');
        return;
      }
      document.getElementById('cropModal').style.display = 'flex';
    });

    // Escape HTML utility
    function escapeHtml(text) {
      return String(text).replace(/[&<>"]/g, function(m) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];
      });
    }

    // Dynamic form rendering functions
    function renderWorkFields() {
      const container = document.getElementById('workEntries');
      container.innerHTML = '';
      workItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'reference-entry';
        div.dataset.index = index;
        div.innerHTML = `
          <div class="input-field" style="flex:1 1 180px;"><label>Period</label><input class="work-date" value="${escapeHtml(item.date)}"></div>
          <div class="input-field" style="flex:2 1 200px;"><label>Role</label><input class="work-role" value="${escapeHtml(item.role)}"></div>
          <div class="input-field" style="flex:2 1 200px;"><label>Institution</label><input class="work-institution" value="${escapeHtml(item.institution)}"></div>
          <div class="input-field" style="flex:1 1 100%;"><label>Description</label><textarea class="work-desc" rows="3">${escapeHtml(item.description)}</textarea></div>
          <button type="button" class="btn-outline btn remove-work-btn">✕</button>
        `;
        container.appendChild(div);
      });
      
      // Attach remove handlers
      document.querySelectorAll('.remove-work-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          const idx = parseInt(e.target.closest('.reference-entry').dataset.index);
          workItems.splice(idx, 1);
          renderWorkFields();
          updateCVPreview();
        });
      });
      
      // Attach input sync handlers
      document.querySelectorAll('#workEntries .reference-entry').forEach(entry => {
        const idx = parseInt(entry.dataset.index);
        const inputs = entry.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          input.addEventListener('input', function() {
            workItems[idx] = {
              date: entry.querySelector('.work-date').value,
              role: entry.querySelector('.work-role').value,
              institution: entry.querySelector('.work-institution').value,
              description: entry.querySelector('.work-desc').value
            };
            updateCVPreview();
          });
        });
      });
    }

    function renderEducationFields() {
      const container = document.getElementById('educationEntries');
      container.innerHTML = '';
      educationItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'reference-entry';
        div.dataset.index = index;
        div.innerHTML = `
          <div class="input-field" style="flex:1 1 160px;"><label>Date</label><input class="edu-date" value="${escapeHtml(item.date)}"></div>
          <div class="input-field" style="flex:2 1 200px;"><label>Degree</label><input class="edu-degree" value="${escapeHtml(item.degree)}"></div>
          <div class="input-field" style="flex:2 1 200px;"><label>Institution</label><input class="edu-institution" value="${escapeHtml(item.institution)}"></div>
          <div class="input-field" style="flex:1 1 100%;"><label>Extra</label><textarea class="edu-extra" rows="2">${escapeHtml(item.extra || '')}</textarea></div>
          <button type="button" class="btn-outline btn remove-edu-btn">✕</button>
        `;
        container.appendChild(div);
      });
      
      document.querySelectorAll('.remove-edu-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          const idx = parseInt(e.target.closest('.reference-entry').dataset.index);
          educationItems.splice(idx, 1);
          renderEducationFields();
          updateCVPreview();
        });
      });
      
      document.querySelectorAll('#educationEntries .reference-entry').forEach(entry => {
        const idx = parseInt(entry.dataset.index);
        const inputs = entry.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          input.addEventListener('input', function() {
            educationItems[idx] = {
              date: entry.querySelector('.edu-date').value,
              degree: entry.querySelector('.edu-degree').value,
              institution: entry.querySelector('.edu-institution').value,
              extra: entry.querySelector('.edu-extra').value
            };
            updateCVPreview();
          });
        });
      });
    }

    function renderReferenceFields() {
      const container = document.getElementById('referenceEntries');
      container.innerHTML = '';
      referenceItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'reference-entry';
        div.dataset.index = index;
        div.innerHTML = `
          <div class="input-field" style="flex:2 1 180px;"><label>Organization</label><input class="ref-org" value="${escapeHtml(item.organization)}"></div>
          <div class="input-field" style="flex:2 1 180px;"><label>Name</label><input class="ref-name" value="${escapeHtml(item.name)}"></div>
          <div class="input-field" style="flex:1 1 130px;"><label>Contact</label><input class="ref-contact" value="${escapeHtml(item.contact)}"></div>
          <div class="input-field" style="flex:2 1 200px;"><label>Email</label><input class="ref-email" value="${escapeHtml(item.email)}"></div>
          <button type="button" class="btn-outline btn remove-ref-btn">✕</button>
        `;
        container.appendChild(div);
      });
      
      document.querySelectorAll('.remove-ref-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          const idx = parseInt(e.target.closest('.reference-entry').dataset.index);
          referenceItems.splice(idx, 1);
          renderReferenceFields();
          updateCVPreview();
        });
      });
      
      document.querySelectorAll('#referenceEntries .reference-entry').forEach(entry => {
        const idx = parseInt(entry.dataset.index);
        const inputs = entry.querySelectorAll('input');
        inputs.forEach(input => {
          input.addEventListener('input', function() {
            referenceItems[idx] = {
              organization: entry.querySelector('.ref-org').value,
              name: entry.querySelector('.ref-name').value,
              contact: entry.querySelector('.ref-contact').value,
              email: entry.querySelector('.ref-email').value
            };
            updateCVPreview();
          });
        });
      });
    }

    function renderSkillFields() {
      const container = document.getElementById('skillEntries');
      container.innerHTML = '';
      skillItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'reference-entry';
        div.dataset.index = index;
        div.innerHTML = `
          <div class="input-field" style="flex:2 1 180px;"><label>Skill</label><input class="skill-name" value="${escapeHtml(item.name)}"></div>
          <div class="input-field" style="flex:1 1 130px;"><label>Level (Optional)</label><input class="skill-level-input" value="${escapeHtml(item.level)}" placeholder="e.g. Expert, 5/5"></div>
          <button type="button" class="btn-outline btn remove-skill-btn">✕</button>
        `;
        container.appendChild(div);
      });
      document.querySelectorAll('.remove-skill-btn').forEach(btn => btn.addEventListener('click', e => {
          skillItems.splice(parseInt(e.target.closest('.reference-entry').dataset.index), 1);
          renderSkillFields(); updateCVPreview();
      }));
      document.querySelectorAll('#skillEntries .reference-entry').forEach(entry => {
        entry.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
          skillItems[parseInt(entry.dataset.index)] = { name: entry.querySelector('.skill-name').value, level: entry.querySelector('.skill-level-input').value };
          updateCVPreview();
        }));
      });
    }

    function renderLanguageFields() {
      const container = document.getElementById('languageEntries');
      container.innerHTML = '';
      languageItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'reference-entry';
        div.dataset.index = index;
        div.innerHTML = `
          <div class="input-field" style="flex:2 1 180px;"><label>Language</label><input class="lang-name" value="${escapeHtml(item.name)}"></div>
          <div class="input-field" style="flex:1 1 130px;"><label>Proficiency</label><input class="lang-level-input" value="${escapeHtml(item.level)}" placeholder="e.g. Native, Fluent"></div>
          <button type="button" class="btn-outline btn remove-lang-btn">✕</button>
        `;
        container.appendChild(div);
      });
      document.querySelectorAll('.remove-lang-btn').forEach(btn => btn.addEventListener('click', e => {
          languageItems.splice(parseInt(e.target.closest('.reference-entry').dataset.index), 1);
          renderLanguageFields(); updateCVPreview();
      }));
      document.querySelectorAll('#languageEntries .reference-entry').forEach(entry => {
        entry.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
          languageItems[parseInt(entry.dataset.index)] = { name: entry.querySelector('.lang-name').value, level: entry.querySelector('.lang-level-input').value };
          updateCVPreview();
        }));
      });
    }

    // CV Preview update
    function updateCVPreview() {
      const fullName = document.getElementById('fullName')?.value || "Your Name";
      const objective = document.getElementById('objective')?.value || '';
      
      let html = `<div class="cv-header">`;
      if (profileImage) {
        html += `<img src="${profileImage}" class="cv-photo" alt="Profile">`;
      }
      html += `<div class="cv-name-section"><h1>${escapeHtml(fullName)}</h1><div class="cv-subtitle">Curriculum Vitae</div></div></div>`;
      
      html += `<div class="section-heading"><span style="font-size: 1.2rem;">👤</span> Resume Objective</div>`;
      html += `<div class="objective-text">${escapeHtml(objective).replace(/\n/g, '<br>')}</div>`;
      
      html += `<div class="section-heading"><span style="font-size: 1.2rem;">💼</span> Work Experience</div>`;
      workItems.forEach(item => {
        html += `<div class="experience-item">
          <div class="date-location">${escapeHtml(item.date)}</div>
          <div class="role-title">${escapeHtml(item.role)}</div>
          <div class="institution">${escapeHtml(item.institution)}</div>
          <div class="desc" style="color: var(--theme-text-sub); margin-top: 0.3rem;">${escapeHtml(item.description)}</div>
        </div>`;
      });
      
      html += `<div class="section-heading"><span style="font-size: 1.2rem;">🎓</span> Education</div>`;
      educationItems.forEach(item => {
        html += `<div class="education-item">
          <div class="date-location">${escapeHtml(item.date)}</div>
          <div style="font-size: 1.1rem; color: var(--theme-accent);"><strong>${escapeHtml(item.degree)}</strong></div>
          <div class="institution">${escapeHtml(item.institution)}</div>
          ${item.extra && item.extra.trim() ? `<div class="desc" style="color: var(--theme-text-sub); margin-top: 0.3rem;">${escapeHtml(item.extra)}</div>` : ''}
        </div>`;
      });
      
      html += `<div class="section-heading"><span style="font-size: 1.2rem;">�️</span> Skills</div><div class="skills-grid">`;
      skillItems.forEach(item => {
        if(item.name.trim() !== '') {
            html += `<div class="skill-pill"><strong>${escapeHtml(item.name)}</strong> ${item.level ? `<span class="skill-level">• ${escapeHtml(item.level)}</span>` : ''}</div>`;
        }
      });
      html += `</div>`;
      
      html += `<div class="section-heading"><span style="font-size: 1.2rem;">🌍</span> Languages</div><div class="skills-grid">`;
      languageItems.forEach(item => {
        if(item.name.trim() !== '') {
            html += `<div class="skill-pill"><strong>${escapeHtml(item.name)}</strong> ${item.level ? `<span class="skill-level">• ${escapeHtml(item.level)}</span>` : ''}</div>`;
        }
      });
      html += `</div>`;
      
      html += `<div class="section-heading"><span style="font-size: 1.2rem;">�📇</span> References</div><div class="reference-grid">`;
      referenceItems.forEach(ref => {
        html += `<div class="ref-item">
          <strong style="color: var(--theme-accent); font-size: 1.05rem;">${escapeHtml(ref.organization)}</strong><br>
          <span style="color: var(--theme-text-strong); font-weight: 500;">${escapeHtml(ref.name)}</span><br>
          <span style="color: #4a5d6a; font-size: 0.9rem;">📞 ${escapeHtml(ref.contact)}</span><br>
          <span style="color: #4a5d6a; font-size: 0.9rem;">✉️ ${escapeHtml(ref.email)}</span>
        </div>`;
      });
      html += `</div>`;
      
      // Add download button
      html += `<div class="cv-actions"><button type="button" class="download-btn" id="downloadPdfBtn">📥 Download as PDF</button></div>`;
      
      document.getElementById('cvOutput').innerHTML = html;
      
      // Attach download handler
      document.getElementById('downloadPdfBtn').addEventListener('click', downloadCVAsPDF);
      
      if (typeof saveCurrentState === 'function') saveCurrentState();
    }

    /**
     * Download the CV preview as a PDF file
     */
    function downloadCVAsPDF() {
      const fullName = document.getElementById('fullName')?.value || 'CV';
      const cvElement = document.getElementById('cvOutput');
      
      // Temporarily hide the download button
      const downloadBtn = cvElement.querySelector('.cv-actions');
      if (downloadBtn) downloadBtn.style.display = 'none';

      // Store initial styles to restore later
      const state = {
        boxShadow: cvElement.style.boxShadow,
        borderRadius: cvElement.style.borderRadius,
        maxWidth: cvElement.style.maxWidth,
        margin: cvElement.style.margin,
        transform: cvElement.style.transform
      };

      // Optimize viewing element specifically for perfect A4 generation
      // This ensures html2canvas precisely captures the UI as-is
      cvElement.style.boxShadow = 'none';
      cvElement.style.borderRadius = '0';
      cvElement.style.maxWidth = '100%';
      cvElement.style.margin = '0 auto';
      cvElement.style.transform = 'none';

      // Setting options to fit the document automatically into one pdf page
      const opt = {
        margin:       [10, 10, 10, 10], // Top, Left, Bottom, Right
        filename:     `${fullName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_CV.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          scrollY: 0,
          windowWidth: document.documentElement.offsetWidth // Capture current responsive layout
        },
        jsPDF:        { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak:    { mode: 'avoid-all' } // Keeps references and sections united on the same page
      };

      // html2pdf is an async process: generate PDF directly from the LIVE, visible element
      html2pdf().set(opt).from(cvElement).save().then(() => {
        // Restore styles and button on success
        cvElement.style.boxShadow = state.boxShadow;
        cvElement.style.borderRadius = state.borderRadius;
        cvElement.style.maxWidth = state.maxWidth;
        cvElement.style.margin = state.margin;
        cvElement.style.transform = state.transform;
        if (downloadBtn) downloadBtn.style.display = 'flex';
      }).catch(err => {
        // Restore styles and button on error
        console.error('PDF generation error:', err);
        cvElement.style.boxShadow = state.boxShadow;
        cvElement.style.borderRadius = state.borderRadius;
        cvElement.style.maxWidth = state.maxWidth;
        cvElement.style.margin = state.margin;
        cvElement.style.transform = state.transform;
        if (downloadBtn) downloadBtn.style.display = 'flex';
        alert('Error generating PDF. Please try again.');
      });
    }

    // Event listeners for main form
    document.getElementById('fullName').addEventListener('input', updateCVPreview);
    document.getElementById('objective').addEventListener('input', updateCVPreview);
    
    document.getElementById('addWorkBtn').addEventListener('click', function() {
      workItems.push({date: '', role: '', institution: '', description: ''});
      renderWorkFields();
    });
    
    document.getElementById('addEducationBtn').addEventListener('click', function() {
      educationItems.push({date: '', degree: '', institution: '', extra: ''});
      renderEducationFields();
    });
    
    document.getElementById('addSkillBtn').addEventListener('click', function() {
      skillItems.push({name: '', level: ''});
      renderSkillFields();
    });
    
    document.getElementById('addLanguageBtn').addEventListener('click', function() {
      languageItems.push({name: '', level: ''});
      renderLanguageFields();
    });
    
    document.getElementById('addReferenceBtn').addEventListener('click', function() {
      referenceItems.push({organization: '', name: '', contact: '', email: ''});
      renderReferenceFields();
    });
    
    document.getElementById('resetDefaultBtn').addEventListener('click', function() {
      workItems = JSON.parse(JSON.stringify(defaultData.work));
      educationItems = JSON.parse(JSON.stringify(defaultData.education));
      skillItems = JSON.parse(JSON.stringify(defaultData.skills));
      languageItems = JSON.parse(JSON.stringify(defaultData.languages));
      referenceItems = JSON.parse(JSON.stringify(defaultData.references));
      document.getElementById('fullName').value = defaultData.fullName;
      document.getElementById('objective').value = defaultData.objective;
      profileImage = null;
      cropImage = null;
      
      // Reset Theme
      const firstRadio = document.querySelector('input[name="themeColor"][value="royal"]');
      if(firstRadio) firstRadio.checked = true;
      applyTheme('royal');
      
      document.getElementById('photoPreview').innerHTML = '<span style="color:#8a9aa8;">No photo</span>';
      renderWorkFields();
      renderEducationFields();
      renderSkillFields();
      renderLanguageFields();
      renderReferenceFields();
      updateCVPreview();
    });
    
    document.getElementById('cvForm').addEventListener('submit', function(e) {
      e.preventDefault();
      updateCVPreview();
      document.getElementById('cvOutput').scrollIntoView({behavior: 'smooth'});
    });

    // --- Auto-Save Feature ---
    function saveCurrentState() {
      try {
        const state = {
          fullName: document.getElementById('fullName')?.value,
          objective: document.getElementById('objective')?.value,
          theme: document.querySelector('input[name="themeColor"]:checked')?.value,
          workItems,
          educationItems,
          skillItems,
          languageItems,
          referenceItems,
          profileImage
        };
        localStorage.setItem('qismatCVState', JSON.stringify(state));
      } catch(e) { console.warn("Failed to save state", e); }
    }

    function loadSavedState() {
      try {
        const saved = localStorage.getItem('qismatCVState');
        if (saved) {
          const state = JSON.parse(saved);
          workItems = state.workItems || workItems;
          educationItems = state.educationItems || educationItems;
          skillItems = state.skillItems || skillItems;
          languageItems = state.languageItems || languageItems;
          referenceItems = state.referenceItems || referenceItems;
          if (state.profileImage) {
            profileImage = state.profileImage;
            document.getElementById('photoPreview').innerHTML = `<img src="${profileImage}" alt="Profile photo">`;
          }
          if (state.fullName) document.getElementById('fullName').value = state.fullName;
          if (state.objective) document.getElementById('objective').value = state.objective;
          if (state.theme) {
            const radio = document.querySelector(`input[name="themeColor"][value="${state.theme}"]`);
            if (radio) {
                radio.checked = true;
                applyTheme(state.theme);
            }
          }
        }
      } catch(e) { console.warn("Failed to load state", e); }
    }

    loadSavedState();
    // -------------------------

    // Initial render
    renderWorkFields();
    renderEducationFields();
    renderSkillFields();
    renderLanguageFields();
    renderReferenceFields();
    updateCVPreview();
  })();