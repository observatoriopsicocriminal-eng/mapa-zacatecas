// config.js - Parámetros de Enlace e Infraestructura GIS para el Observatorio Psicocriminal

// Enlace optimizado para la extracción directa de datos vectoriales en formato CSV
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8IXB_orCVp5KMu4bCoYhXnPkvriO49i7DX2S59u4HSKaoQudOkEtvPDMXcDRfbnvTP3y2VppuAlh0/pub?output=csv";

// Configuración espacial restrictiva para el Estado de Zacatecas
const MAP_CONFIG = {
    center: [22.7709, -102.5832],
    zoom: 8,
    minZoom: 7,
    maxZoom: 14,
    bounds: [
        [20.5, -104.5], // Límite Suroeste
        [25.0, -100.5]  // Límite Noreste
    ]
};
