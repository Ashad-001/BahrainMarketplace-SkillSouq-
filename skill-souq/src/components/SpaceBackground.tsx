"use client";

export default function SpaceBackground() {
  return (
    <>
      {/* This container ONLY appears when 'dark' mode is active on the HTML tag */}
      <div className="fixed inset-0 z-[-10] hidden dark:block bg-[#05050A] overflow-hidden">
        
        {/* Layer 1: The Static Starfield */}
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-[#05050A] to-[#05050A]"></div>
        <div className="stars-layer-1"></div>
        <div className="stars-layer-2"></div>
        
        {/* Layer 2: The Rare Shooting Star */}
        <div className="shooting-star-container">
          <div className="shooting-star"></div>
        </div>
      </div>

      {/* The CSS Engine for Space Mode */}
      <style jsx global>{`
        /* Generate a random scatter of tiny stars using box-shadow */
        .stars-layer-1 {
          width: 1px;
          height: 1px;
          background: transparent;
          box-shadow: 17vw 45vh #fff, 82vw 12vh #fff, 42vw 82vh #fff, 12vw 14vh #fff,
                      54vw 23vh #fff, 91vw 54vh #fff, 23vw 76vh #fff, 76vw 91vh #fff,
                      65vw 34vh #fff, 34vw 65vh #fff, 88vw 88vh #fff, 11vw 89vh #fff;
          animation: twinkle 4s infinite alternate;
        }
        
        .stars-layer-2 {
          width: 2px;
          height: 2px;
          background: transparent;
          box-shadow: 25vw 30vh #fff, 70vw 60vh #fff, 50vw 40vh #fff, 80vw 20vh #fff,
                      10vw 50vh #fff, 40vw 90vh #fff, 90vw 10vh #fff;
          opacity: 0.5;
          animation: twinkle 6s infinite alternate-reverse;
        }

        /* The Shooting Star Logic */
        .shooting-star-container {
          position: absolute;
          top: 10%;
          left: 10%;
          width: 100%;
          height: 100%;
          transform: rotate(-45deg);
        }

        .shooting-star {
          position: absolute;
          width: 100px;
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%);
          opacity: 0;
          animation: shootingStar 8s linear infinite;
        }

        @keyframes twinkle {
          0% { opacity: 0.3; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }

        @keyframes shootingStar {
          0% { transform: translateX(0); opacity: 0; }
          5% { opacity: 1; }
          10% { transform: translateX(800px); opacity: 0; }
          100% { transform: translateX(800px); opacity: 0; } /* Waits 8 seconds before repeating */
        }
      `}</style>
    </>
  );
}
