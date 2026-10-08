// Preview-only themes: no choice is persisted until Khubaib selects a palette.
(() => {
 const themes={
  'walnut-sage':{grain:'walnut',ink:'#f0eddd',muted:'#b9c2a8',copy:'#d0d3c0',paper:'#2d231c',accent:'#b5c69f',secondary:'#cf9c75',surface:'#40372b'},
  'cocoa-blue':{grain:'cocoa',ink:'#f0e8e1',muted:'#b1c0cd',copy:'#ced7dd',paper:'#2b1f20',accent:'#a9c6dc',secondary:'#d0a384',surface:'#403136'},
  'espresso':{grain:'espresso',ink:'#f5e9d6',muted:'#bdaa92',copy:'#d0bfa8',paper:'#24170f',accent:'#e2bb83',secondary:'#c78560',surface:'#3d2a1d'},
  'ocean-clay':{grain:'ocean',ink:'#283b46',muted:'#788d97',copy:'#607781',paper:'#f8f3e9',accent:'#537f94',secondary:'#bb775b',surface:'#e0eaf0'},
  'sage-rose':{grain:'garden',ink:'#2e4035',muted:'#859282',copy:'#68796b',paper:'#f6f3e9',accent:'#617d65',secondary:'#ad6975',surface:'#e3eadb'},
  'lilac-honey':{grain:'lilac',ink:'#3d3449',muted:'#92859e',copy:'#7a6b86',paper:'#f7f3ed',accent:'#86709b',secondary:'#b38c42',surface:'#eae1f2'}
 };
 const name=new URLSearchParams(location.search).get('theme')||'espresso',theme=themes[name];
 if(!theme)return;
 if(['espresso','walnut-sage','cocoa-blue'].includes(name))document.documentElement.setAttribute('data-dark-theme','');
 window.portfolioTheme=theme;document.documentElement.dataset.theme=name;
 for(const [key,value] of Object.entries({ink:theme.ink,muted:theme.muted,'body-copy':theme.copy,paper:theme.paper,accent:theme.accent,'theme-secondary':theme.secondary,'theme-surface':theme.surface}))document.documentElement.style.setProperty(`--${key}`,value);
})();
