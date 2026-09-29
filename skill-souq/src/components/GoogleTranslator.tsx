"use client";
import { useEffect } from "react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

export default function GoogleTranslator() {
  useEffect(() => {
    // 1. Create the initialization function that Google's script will look for
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,ar,hi,ur", // Only allow our 4 languages
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };

    // 2. Inject the Google script into the page
    const script = document.createElement("script");
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <>
      {/* Zero opacity, absolute position, pushed off screen */}
      <div
        id="google_translate_element"
        style={{ opacity: 0, position: 'absolute', zIndex: -9999, pointerEvents: 'none' }}
      ></div>

      <style jsx global>{`
        /* 1. Kill the exact wrapper Google injects at the bottom of the body */
        body > .skiptranslate {
          display: none !important;
        }

        /* 2. Stop Google from injecting inline margin/transform onto the HTML tag */
        html, body {
          top: 0 !important;
          position: static !important;
          margin-top: 0 !important;
          transform: none !important;
        }

        /* 3. Kill all Google iframes and tooltips */
        iframe.skiptranslate,
        .goog-te-banner-frame,
        #goog-gt-tt,
        .goog-te-balloon-frame,
        .goog-tooltip,
        .goog-tooltip:hover {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }

        /* 4. Kill the text highlighting during translation */
        .goog-text-highlight {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  );
}
