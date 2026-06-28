// ======================================================
// config.js
// Configuración Cartográfica del Observatorio Psicocriminal
// ======================================================

"use strict";

// Configuración del mapa
const MAP_CONFIG = Object.freeze({

    center: [22.7709, -102.5832],

    zoom: 8,

    minZoom: 7,

    maxZoom: 14,

    bounds: [

        [21.0, -104.5],

        [25.0, -100.5]

    ]

});

// Google Sheets publicado como CSV
const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8IXB_orCVp5KMu4bCoYhXnPkvriO49i7DX2S59u4HSKaoQudOkEtvPDMXcDRfbnvTP3y2VppuAlh0/pub?output=csv&cacheBust=" +
    Date.now();
