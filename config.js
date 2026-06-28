JavaScript
// config.js - Configuración Cartográfica del Observatorio Psicocriminal

const MAP_CONFIG = {
    center: [22.7709, -102.5832], // Centro geográfico del Estado de Zacatecas
    zoom: 8,
    minZoom: 7,
    maxZoom: 14,
    bounds: [
        [21.0, -104.5], // Límite Suroeste
        [25.0, -100.5]  // Límite Noreste
    ]
};

// Enlace limpio a Google Sheets con actualización forzada de datos
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8IXB_orCVp5KMu4bCoYhXnPkvriO49i7DX2S59u4HSKaoQudOkEtvPDMXcDRfbnvTP3y2VppuAlh0/pub?output=csv&cachebust=" + new Date().getTime();
