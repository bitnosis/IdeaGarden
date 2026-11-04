<svg class="growing-sprout" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <path class="ground" d="M23 81H73"/>
  <g class="plant">
    <path class="stem" pathLength="1" d="M48 80C55 66 42 58 48 45C51 39 55 36 60 33"/>
    <path class="leaf leaf-left" d="M47 55C30 58 20 48 20 33C36 30 49 39 47 55Z"/>
    <path class="leaf leaf-right" d="M52 40C48 22 61 12 78 14C80 31 69 43 52 40Z"/>
  </g>
</svg>

<style>
  .growing-sprout { width: 108px; height: 108px; overflow: visible; }
  .ground { opacity: .5; }
  .plant { transform-origin: 48px 81px; animation: sprout-cycle 6.5s ease-in-out infinite; }
  .stem { stroke-dasharray: 1; animation: stem-grow 6.5s ease-in-out infinite; }
  .leaf { fill: color-mix(in oklab, currentColor 8%, transparent); }
  .leaf-left { transform-origin: 47px 55px; animation: left-unfold 6.5s ease-in-out infinite; }
  .leaf-right { transform-origin: 52px 40px; animation: right-unfold 6.5s ease-in-out infinite; }
  @keyframes stem-grow { 0%, 5% { stroke-dashoffset: 1; } 35%, 100% { stroke-dashoffset: 0; } }
  @keyframes left-unfold { 0%, 19% { transform: rotate(22deg) scale(0); } 40% { transform: rotate(-4deg) scale(1.06); } 49%, 100% { transform: rotate(0) scale(1); } }
  @keyframes right-unfold { 0%, 32% { transform: rotate(-24deg) scale(0); } 54% { transform: rotate(3deg) scale(1.06); } 63%, 100% { transform: rotate(0) scale(1); } }
  @keyframes sprout-cycle { 0%, 58% { opacity: 1; transform: rotate(0); } 67% { transform: rotate(-2deg); } 77% { transform: rotate(2deg); } 86% { opacity: 1; transform: rotate(0); } 97%, 100% { opacity: 0; transform: rotate(0); } }
  @media (prefers-reduced-motion: reduce) { .plant, .stem, .leaf { animation: none; transform: none; } .plant { opacity: 1; } .stem { stroke-dashoffset: 0; } }
  @media (max-width: 800px) { .growing-sprout { width: 96px; height: 96px; } }
</style>
