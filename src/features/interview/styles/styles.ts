export const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

  :root {
    --ink:     #0e0e11;
    --ink-2:   #3d3d46;
    --ink-3:   #8b8b99;
    --ink-4:   #c4c4cc;
    --canvas:  #f7f6f2;
    --paper:   #ffffff;
    --violet:  #5b3cf5;
    --violet-l:#ede9fe;
    --violet-m:#7c5cfc;
    --teal:    #0ea8a0;
    --teal-l:  #ccf5f3;
    --amber:   #e8770d;
    --rose:    #e8364a;
    --border:  #e8e7e3;
    --shadow:  0 1px 3px rgba(14,14,17,.06), 0 4px 16px rgba(14,14,17,.06);
    --shadow-lg: 0 2px 8px rgba(14,14,17,.08), 0 12px 40px rgba(14,14,17,.10);
  }

  * { font-family: 'DM Sans', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }

  .mirror { transform: scaleX(-1); }

  /* Page fade-in */
  @keyframes fade-up {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .fade-up { animation: fade-up .5s cubic-bezier(.16,1,.3,1) both; }
  .delay-1 { animation-delay:.08s; }
  .delay-2 { animation-delay:.16s; }
  .delay-3 { animation-delay:.24s; }

  /* Active speaking ring — violet */
  @keyframes ring-v {
    0%   { box-shadow: 0 0 0 0px rgba(91,60,245,.5); }
    70%  { box-shadow: 0 0 0 10px rgba(91,60,245,0); }
    100% { box-shadow: 0 0 0 0px rgba(91,60,245,0); }
  }
  .ring-violet { animation: ring-v 1.8s ease-out infinite; }

  /* Active listening ring — teal */
  @keyframes ring-t {
    0%   { box-shadow: 0 0 0 0px rgba(14,168,160,.5); }
    70%  { box-shadow: 0 0 0 10px rgba(14,168,160,0); }
    100% { box-shadow: 0 0 0 0px rgba(14,168,160,0); }
  }
  .ring-teal { animation: ring-t 1.6s ease-out infinite; }

  /* Dot blink */
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
  .blink { animation: blink 1.2s ease-in-out infinite; }

  /* Wave bars */
  @keyframes wave-a { 0%,100%{transform:scaleY(.25)} 50%{transform:scaleY(1)} }
  @keyframes wave-b { 0%,100%{transform:scaleY(.55)} 50%{transform:scaleY(.3)} }
  @keyframes wave-c { 0%,100%{transform:scaleY(.35)} 50%{transform:scaleY(.9)} }

  /* Transcript message appear */
  @keyframes msg-in {
    from { opacity:0; transform:translateY(6px) scale(.98); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  .msg-in { animation: msg-in .3s cubic-bezier(.16,1,.3,1) both; }

  /* Thin scroll */
  .thin-scroll::-webkit-scrollbar { width:3px; }
  .thin-scroll::-webkit-scrollbar-track { background:transparent; }
  .thin-scroll::-webkit-scrollbar-thumb { background:var(--border); border-radius:99px; }

  /* Subtle page texture */
  .canvas-bg {
    background-color: var(--canvas);
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.018'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }

  /* Card elevation on hover */
  .card-hover { transition: box-shadow .25s ease, transform .25s ease; }
  .card-hover:hover { box-shadow: var(--shadow-lg); }

  /* Gradient divider */
  .grad-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border) 30%, var(--border) 70%, transparent);
  }
`;