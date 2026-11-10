(function () {
    'use strict';

    if (window.upendraTrackingInitialized) return;
    window.upendraTrackingInitialized = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
        window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', 'G-9YH1D05QCJ');

    var googleAnalytics = document.createElement('script');
    googleAnalytics.async = true;
    googleAnalytics.src = 'https://www.googletagmanager.com/gtag/js?id=G-9YH1D05QCJ';
    document.head.appendChild(googleAnalytics);

    window.clarity = window.clarity || function () {
        (window.clarity.q = window.clarity.q || []).push(arguments);
    };

    var clarity = document.createElement('script');
    clarity.async = true;
    clarity.src = 'https://www.clarity.ms/tag/zbchurnmo5?ref=bwt';
    document.head.appendChild(clarity);
})();