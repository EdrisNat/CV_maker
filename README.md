# Qismat CV Generator

A sleek, responsive, and highly customizable single-page web application for building professional CVs (resumes) in the browser. Built with vanilla web technologies, it features a live preview, two premium templates, drag-and-drop section management, photo cropping, autosave, and instant PDF export — all client-side, with no backend.

## ✨ Features

### Content
- **Live Preview** — the CV updates in real time as you type.
- **Rich personal profile** — full name, professional headline, plus optional **Gender, Marital Status, and Nationality** fields.
- **Contact Information** — email, phone, location, LinkedIn, and website/portfolio, rendered as clean contact chips.
- **Dynamic sections** — Work Experience, Education, Skills, Languages, References, and the newer **Certifications, Projects, Awards & Honors, and Volunteering**.
- **Drag-and-drop reordering** — reorder items within any section, or reorder and show/hide whole sections from the **Manage Sections** panel.

### Design & layout
- **Two premium templates** — a single-column **Classic** layout and a two-column **Sidebar** layout.
- **Premium theme colors** — Royal Blue, Emerald, Burgundy, Modern Slate, and Classic Black.
- **Typography pairings** — Elegant Serif, Modern Sans, or Timeless.
- **Photo controls** — circle / square / no-photo, plus an **ATS-friendly mode** that strips the photo and decorative accents for resume scanners.
- **Light / Dark app theme** for the editor.
- **CV Strength meter** — a live completeness indicator that suggests what to add next.

### Data & export
- **Autosave** — your work is saved in the browser (localStorage) automatically.
- **Export / Import JSON** — back up your CV data or move it between devices.
- **Shareable link** — copy a link that encodes your CV (photo excluded to keep the URL usable).
- **Advanced photo uploader** — built-in crop and zoom via the HTML5 Canvas API.
- **One-click PDF export** — multi-page A4 output via `html2pdf.js`, without splitting entries across page breaks.

## 🛠️ Technologies Used

- **HTML5** — semantic structure and form elements.
- **CSS3** — Flexbox, CSS Grid, CSS custom properties for theming, and responsive media queries.
- **JavaScript (ES6)** — a central state model with a section registry that drives the live preview, templates, reordering, visibility, import/export, and Canvas-based image cropping.
- **html2pdf.js** — client-side HTML-to-PDF generation.

## 🚀 Getting Started

This is a client-side-only application with no build step or backend.

1. **Clone or download** the source files.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. Start building your CV immediately.

> Tip: some browsers restrict `localStorage` and clipboard features on `file://` pages. For the full experience, serve the folder locally, e.g. `python -m http.server` and open `http://localhost:8000`.

## 📝 Usage Guide

1. **Choose a design** — pick a template, theme color, font pairing, and photo shape in **Design & Layout**.
2. **Upload your photo** — click "Choose Image", then "Adjust Position" to drag and zoom until it fits the frame.
3. **Fill out your details** — name, headline, contact info, personal details, and objective.
4. **Add your history** — use the "+ Add" buttons to append Work Experience, Education, Skills, Languages, Certifications, Projects, Awards, Volunteering, and References.
5. **Manage sections** — toggle sections on/off and drag to reorder them in the **Manage Sections** panel.
6. **Save & share** — export your data as JSON, import it elsewhere, or copy a shareable link.
7. **Generate & download** — click **Download as PDF** (or **Generate Premium CV**) to save your document.

## 👨‍💻 Developer / Author

**Developed by Edris (Ssemujju Edirisa)**

*Created in 2026.*
