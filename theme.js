// Preview-only themes: no choice is persisted until Khubaib selects a palette.
(() => {
 const themes={
  'espresso':{grain:'espresso',ink:'#f5e9d6',muted:'#bdaa92',copy:'#d0bfa8',paper:'#24170f',accent:'#e2bb83',secondary:'#c78560',surface:'#3d2a1d'},
  'ocean-clay':{grain:'ocean',ink:'#283b46',muted:'#788d97',copy:'#607781',paper:'#f8f3e9',accent:'#537f94',secondary:'#bb775b',surface:'#e0eaf0'},
  'sage-rose':{grain:'garden',ink:'#2e4035',muted:'#859282',copy:'#68796b',paper:'#f6f3e9',accent:'#617d65',secondary:'#ad6975',surface:'#e3eadb'},
  'lilac-honey':{grain:'lilac',ink:'#3d3449',muted:'#92859e',copy:'#7a6b86',paper:'#f7f3ed',accent:'#86709b',secondary:'#b38c42',surface:'#eae1f2'}
 };
 const name=new URLSearchParams(location.search).get('theme'),theme=themes[name];
 if(!theme)return;
 window.portfolioTheme=theme;document.documentElement.dataset.theme=name;
 for(const [key,value] of Object.entries({ink:theme.ink,muted:theme.muted,'body-copy':theme.copy,paper:theme.paper,accent:theme.accent,'theme-secondary':theme.secondary,'theme-surface':theme.surface}))document.documentElement.style.setProperty(`--${key}`,value);
})();
