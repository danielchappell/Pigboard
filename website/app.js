(() => {
  const toast = document.querySelector('.toast');
  let timer;
  function announce(message) {
    if (!toast) return;
    clearTimeout(timer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    timer = setTimeout(() => toast.classList.remove('is-visible'), 4000);
  }
  document.querySelectorAll('[data-copy]').forEach(button => {
    const source = document.getElementById(button.dataset.copy);
    if (!source) return;
    button.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(source.textContent);
        announce('Example brief copied. Adapt it to your product.');
      } catch {
        const range = document.createRange();
        range.selectNodeContents(source);
        const selection = window.getSelection();
        selection.removeAllRanges(); selection.addRange(range);
        announce('Text selected. Use your copy shortcut.');
      }
    });
  });
  document.querySelectorAll('[data-tablist]').forEach(list => {
    const tabs = Array.from(list.querySelectorAll('[data-panel]'));
    const panels = tabs.map(tab => document.getElementById(tab.dataset.panel));
    if (!tabs.length || panels.some(panel => !panel)) return;
    function select(selected, focus = false) {
      tabs.forEach((tab, index) => {
        const active = tab === selected;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[index].hidden = !active;
      });
      if (focus) selected.focus();
    }
    list.setAttribute('role', 'tablist');
    tabs.forEach((tab, index) => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panels[index].id);
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].setAttribute('aria-labelledby', tab.id);
      panels[index].tabIndex = 0;
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index+1)%tabs.length;
        else if (event.key === 'ArrowLeft') next = (index-1+tabs.length)%tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length-1;
        else return;
        event.preventDefault(); select(tabs[next], true);
      });
    });
    select(tabs[0]);
    list.hidden = false;
  });
})();
