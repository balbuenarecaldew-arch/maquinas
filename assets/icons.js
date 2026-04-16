(() => {
  const App = (window.MaquilerApp = window.MaquilerApp || {});

  const SVG_ICONS = {
    dashboard:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    photo:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h4l2-2h4l2 2h4v12H4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    pricing:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12l-1 6H7zM7 10h10l1 10H6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 14h4M10 18h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    text:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    booking:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v3M17 4v3M5 8h14v11H5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 12.5h2.5v2.5H8.5zM13 12.5h2.5v2.5H13z" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    settings:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 2.5 3-.2.8 2.9 2.7 1.3-1 2.8 1 2.8-2.7 1.3-.8 2.9-3-.2L12 21l-1.8-2.5-3 .2-.8-2.9-2.7-1.3 1-2.8-1-2.8 2.7-1.3.8-2.9 3 .2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    terrain:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18M6 18v-4l4-3 3 2 5-5 2 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    grading:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17h16M6 17l4-8h4l4 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 9V5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    cleanup:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15h11l3-6H8zM8 9l-3 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="18" r="1.3" fill="currentColor"/><circle cx="16" cy="18" r="1.3" fill="currentColor"/></svg>',
    debris:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M7 18l2-7h6l2 7M10 11V6h4v5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    loading:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 16h10l2-5h6v5h-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="18" r="1.8" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="17" cy="18" r="1.8" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    coverage:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-4.8 6-10a6 6 0 10-12 0c0 5.2 6 10 6 10z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="11" r="2.2" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    whatsapp:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    operator:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.5" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6 20a6 6 0 0112 0M16.5 13.5l1.2 1.2 2.8-2.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    speed:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17a7 7 0 1114 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 12l4-2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 17h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    shield:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-2.6 7.8-7 10-4.4-2.2-7-5.5-7-10V6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.5 12.5l1.7 1.7 3.8-4.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l2.4 4.8 5.3.8-3.8 3.7.9 5.3L12 16.3 7.2 18.6l.9-5.3-3.8-3.7 5.3-.8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  };

  App.SVG_ICONS = SVG_ICONS;
  App.iconMarkup = function iconMarkup(icon) {
    return SVG_ICONS[icon] || SVG_ICONS.star;
  };
})();
