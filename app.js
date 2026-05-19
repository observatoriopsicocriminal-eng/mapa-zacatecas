// app.js - Motor GIS Analítico y Georreferenciación Nativa de Zacatecas

document.addEventListener("DOMContentLoaded", () => {
    // Reloj Táctico
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    let map, markerClusterGroup, heatmapLayer;
    let rawEventsData = [];
    let chartInstance = null;

    // Matriz de Pesos Criminológicos IIPS
    const PESOS_IIPS = {
        "Feminicidio": 5,
        "Agresión armada letal": 5,
        "Hallazgo de persona sin vida": 5,
        "Agresión armada no letal": 4,
        "Violencia familiar": 4,
        "Suicidio": 3,
        "Bloqueo carretera": 3,
        "Narcomenudeo": 2,
        "Incendio a bancos": 2
    };

    // DICCIONARIO GEOESPACIAL DE REFERENCIA (58 MUNICIPIOS DE ZACATECAS)
    const COORDENADAS_MUNICIPIOS = {
        "Apozol": [21.4704, -103.0224], "Apulco": [21.4556, -102.6872], "Atolinga": [21.7811, -103.4739],
        "Benito Juárez": [21.5153, -103.5681], "Calera": [22.9464, -102.7042], "Cañitas de Felipe Pescador": [23.6019, -102.7247],
        "Concepción del Oro": [24.6219, -101.4172], "Cuauhtémoc": [22.4497, -102.0833], "Chalchihuites": [23.4725, -103.8822],
        "El Salvador": [24.4719, -100.9161], "Fresnillo": [23.1749, -102.8681], "Genaro Codina": [22.4711, -102.4517],
        "General Enrique Estrada": [22.9961, -102.7436], "General Francisco R. Murguía": [24.0253, -102.9022],
        "General Pánfilo Natera": [22.6631, -101.6111], "Guadalupe": [22.7533, -102.5175], "Huanusco": [21.7706, -102.9719],
        "Jalpa": [21.6369, -102.9786], "Jerez": [22.6486, -103.0011], "Jiménez del Teul": [23.2450, -103.8014],
        "Juan Aldama": [24.2917, -103.3917], "Juchipila": [21.4089, -103.1186], "Loreto": [22.2681, -101.9892],
        "Luis Moya": [22.4322, -102.2153], "Mazapil": [24.6419, -101.5217], "Melchor Ocampo": [24.7119, -101.6667],
        "Mezquital del Oro": [21.2189, -103.3611], "Miguel Auza": [24.1642, -103.4442], "Momax": [21.9197, -103.3131],
        "Monte Escobedo": [22.3028, -103.5606], "Morelos": [22.8617, -102.6106], "Moyahua de Estrada": [21.2683, -103.1594],
        "Nochistlán de Mejía": [21.3636, -102.8444], "Noria de Ángeles": [22.4439, -101.9072], "Ojocaliente": [22.5694, -102.2536],
        "Pánuco": [22.8986, -102.5283], "Pinos": [22.2981, -101.5750], "Río Grande": [23.8242, -103.0314],
        "Sain Alto": [23.5825, -103.2483], "El Plateado de Joaquín Amaro": [22.0194, -103.0089], "Sombrerete": [23.6347, -103.6394],
        "Susticacán": [22.6225, -103.1122], "Tabasco": [21.8625, -102.9111], "Tepechitlán": [22.0653, -103.3283],
        "Tepetongo": [22.4578, -103.1492], "Teúl de González Ortega": [21.4675, -103.4611], "Tlaltenango de Sánchez Román": [21.7825, -103.3039],
        "Trancoso": [22.7356, -102.3667], "Valparaíso": [22.7703, -103.5708], "Vetagrande": [22.8267, -102.5544],
        "Villa de Cos": [23.2944, -102.3422], "Villa García": [22.1153, -101.9567], "Villa González Ortega": [22.5117, -101.9164],
        "Villa Hidalgo": [22.3556, -101.7139], "Villanueva": [22.3544, -102.8853], "Zacatecas": [22.7709, -102.5832],
        "Trinidad García de la Cadena": [21.2136, -103.4650], "Santa María de la Paz": [21.5122, -103.4072]
    };

    function initMap() {
        map = L.map('map', {
            center: MAP_CONFIG.center,
            zoom: MAP_CONFIG.zoom,
            minZoom: MAP_CONFIG.minZoom,
            maxZoom: MAP_CONFIG.maxZoom,
            maxBounds: MAP_CONFIG.bounds,
            maxBoundsViscosity: 1.0
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(map);

        markerClusterGroup = L.markerClusterGroup().addTo(map);
        heatmapLayer = L.heatLayer([], { radius: 25, blur: 15, maxZoom: 12 }).addTo(map);

        document.getElementById('layer-cluster').addEventListener('change', (e) => {
            if (e.target.checked) map.addLayer(markerClusterGroup);
            else map.removeLayer(markerClusterGroup);
        });

        document.getElementById('layer-heatmap').addEventListener('change', (e) => {
            if (e.target.checked) map.addLayer(heatmapLayer);
            else map.removeLayer(heatmapLayer);
        });
    }

    function fetchIntelligenceData() {
        Papa.parse(SHEET_URL, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                rawEventsData = results.data.map(row => {
                    const municipioNombre = row.Municipio ? row.Municipio.trim() : "Zacatecas";
                    
                    let lat = parseFloat(row.Latitud);
                    let lng = parseFloat(row.Longitud);

                    // Si no existen coordenadas explícitas, el motor realiza el emparejamiento con dispersión (Jitter)
                    if (isNaN(lat) || isNaN(lng)) {
                        const coordsDefecto = COORDENADAS_MUNICIPIOS[municipioNombre];
                        if (coordsDefecto) {
                            lat = coordsDefecto[0] + (Math.random() - 0.5) * 0.018;
                            lng = coordsDefecto[1] + (Math.random() - 0.5) * 0.018;
                        } else {
                            lat = 22.7709 + (Math.random() - 0.5) * 0.1;
                            lng = -102.5832 + (Math.random() - 0.5) * 0.1;
                        }
                    }

                    return {
                        id: row.ID || `OP-${Math.floor(Math.random() * 9000) + 1000}`,
                        fecha: row.Fecha || new Date().toISOString().split('T')[0],
                        municipio: municipioNombre,
                        lat: lat,
                        lng: lng,
                        tipo: row.TipoIncidente || row.Clasificacion || "Agresión armada letal",
                        descripcion: row.Descripcion || "Incidente registrado bajo análisis psicocriminal del observatorio.",
                        impacto: row.NivelImpacto || "Alto",
                        victimas: parseInt(row.Victimas) || 1,
                        fuente: row.Fuente || 'Observatorio Psicocriminal'
                    };
                });

                populateFilters();
                processPipeline();
                document.getElementById('loader').classList.add('hidden');
            },
            error: function(err) {
                console.error("Fallo de sincronización externa con Google Sheets. Comprobar permisos públicos.", err);
                document.getElementById('loader').innerHTML = "<p class='text-red-500 font-mono text-xs'>Error de enlace con Google Sheets. Verifique la publicación del archivo.</p>";
            }
        });
    }

    function populateFilters() {
        const muns = [...new Set(rawEventsData.map(e => e.municipio))].sort();
        const select = document.getElementById('filter-municipio');
        select.innerHTML = '<option value="ALL">Todos los Municipios</option>';
        
        muns.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.innerText = m;
            select.appendChild(opt);
        });

        select.addEventListener('change', processPipeline);
        document.getElementById('filter-incidente').addEventListener('change', processPipeline);
    }

    function processPipeline() {
        const selectedMun = document.getElementById('filter-municipio').value;
        const selectedTipo = document.getElementById('filter-incidente').value;

        const filteredData = rawEventsData.filter(e => {
            const matchMun = (selectedMun === "ALL" || e.municipio === selectedMun);
            const matchTipo = (selectedTipo === "ALL" || e.tipo === selectedTipo);
            return matchMun && matchTipo;
        });

        updateMapLayers(filteredData);
        const iipsScore = calculateIIPS(filteredData);
        updateDashboardKPIs(filteredData, iipsScore);
        renderCharts(filteredData);
        executePredictiveAnalysis(filteredData, iipsScore);
    }

    function updateMapLayers(data) {
        markerClusterGroup.clearLayers();
        const heatPoints = [];

        data.forEach(e => {
            heatPoints.push([e.lat, e.lng, 0.7]);

            const marker = L.circleMarker([e.lat, e.lng], {
                radius: 6,
                fillColor: "#dc2626",
                color: "#ffffff",
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.9
            });

            const popupContent = `
                <div class="space-y-1">
                    <div class="text-yellow-500 font-bold border-b border-neutral-700 pb-0.5 uppercase tracking-wide text-[10px]">ID: ${e.id}</div>
                    <div><strong>Fecha:</strong> ${e.fecha}</div>
                    <div><strong>Municipio:</strong> ${e.municipio}</div>
                    <div><strong>Incidente:</strong> <span class="text-red-400">${e.tipo}</span></div>
                    <div><strong>Víctimas:</strong> ${e.victimas}</div>
                    <div class="text-[10px] text-neutral-400 italic mt-1 border-t border-neutral-800 pt-1">${e.descripcion}</div>
                </div>
            `;
            marker.bindPopup(popupContent);
            markerClusterGroup.addLayer(marker);
        });

        heatmapLayer.setLatLngs(heatPoints);
    }

    function calculateIIPS(data) {
        let scoreTotal = 0;
        data.forEach(e => {
            const peso = PESOS_IIPS[e.tipo] || 1;
            scoreTotal += (1 * peso); 
        });
        return scoreTotal;
    }

    function getIIPSStatus(score) {
        if (score <= 40) return { label: "Estabilidad Relativa", color: "bg-emerald-500 text-neutral-950" };
        if (score <= 60) return { label: "Riesgo Controlado", color: "bg-yellow-500 text-neutral-950" };
        if (score <= 80) return { label: "Incremento Sostenido", color: "bg-orange-500 text-neutral-950" };
        return { label: "Alta Desestabilización", color: "bg-red-600 text-white" };
    }

    function updateDashboardKPIs(data, iips) {
        document.getElementById('kpi-total').innerText = data.length;

        const badge = document.getElementById('kpi-iips-badge');
        const status = getIIPSStatus(iips);
        badge.innerText = `${iips} pts - ${status.label}`;
        badge.className = `text-[11px] font-bold block mt-1 px-1.5 py-0.5 rounded text-center uppercase font-mono ${status.color}`;

        const counts = {};
        let maxMun = "Ninguno", maxCount = 0;
        data.forEach(e => {
            counts[e.municipio] = (counts[e.municipio] || 0) + 1;
            if (counts[e.municipio] > maxCount) {
                maxCount = counts[e.municipio];
                maxMun = e.municipio;
            }
        });
        document.getElementById('kpi-municipio').innerText = maxCount > 0 ? `${maxMun} (${maxCount} ev)` : "Ninguno";
    }

    function renderCharts(data) {
        const ctx = document.getElementById('chart-incidencia').getContext('2d');
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const conteosMensuales = Array(12).fill(0);

        data.forEach(e => {
            const mesIndex = new Date(e.fecha).getMonth();
            if(!isNaN(mesIndex)) conteosMensuales[mesIndex]++;
        });

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Incidencia Territorial',
                    data: conteosMensuales,
                    borderColor: '#eab308',
                    backgroundColor: 'rgba(234, 179, 8, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#a3a3a3', font: { size: 9, family: 'monospace' } }, grid: { color: '#262626' } },
                    y: { ticks: { color: '#a3a3a3', font: { size: 9, family: 'monospace' } }, grid: { color: '#262626' }, beginAtZero: true }
                }
            }
        });
    }

    function executePredictiveAnalysis(data, iipsScore) {
        const pText = document.getElementById('predictive-text');
        if (data.length === 0) {
            pText.innerText = "Información geoespacial insuficiente para calcular modelos relacionales.";
            return;
        }

        const status = getIIPSStatus(iipsScore);
        let analisis = `El territorio evalúa un escenario de '${status.label.toUpperCase()}'. `;
        
        if (iipsScore > 70) {
            analisis += "La concentración espacial advierte dinámicas complejas de riesgo psicocriminal. Se requiere monitoreo de vectores de dispersión en zonas colindantes.";
        } else {
            analisis += "El volumen de incidentes se localiza estable en los nodos históricos de contención urbana y ejes viales principales.";
        }
        pText.innerText = analisis;
    }

    document.getElementById('btn-reporte').addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const currentYear = new Date().getFullYear();

        doc.setFillColor(15, 15, 15);
        doc.rect(0, 0, 210, 30, 'F');
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text("OBSERVATORIO PSICOCRIMINAL - REPORTE DE INTELIGENCIA", 14, 15);
        
        doc.setFontSize(9);
        doc.setFont("Helvetica", "italic");
        doc.text("Sistema Territorial de Monitoreo de Violencia del Estado de Zacatecas", 14, 22);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(33, 33, 33);
        doc.text(`Fecha de consulta del sistema: ${new Date().toLocaleString('es-MX')}`, 14, 40);
        doc.text(`Total de eventos evaluados en la muestra: ${rawEventsData.length}`, 14, 46);

        doc.setFont("Helvetica", "bold");
        doc.text("LÍNEA METODOLÓGICA Y REFERENCIA INSTITUCIONAL (APA 7)", 14, 60);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        const refAPA = `Observatorio Psicocriminal. (${currentYear}). Mapa Psicocriminal Interactivo del Estado de Zacatecas. Sistema de Monitoreo Territorial y Análisis Psicocriminal. Recuperado desde la infraestructura de bases analíticas de datos distribuidos del estado.`;
        doc.text(doc.splitTextToSize(refAPA, 180), 14, 66);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.text("DIAGNÓSTICO SITUACIONAL DEL TERRITORIO", 14, 85);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        const interpretacion = document.getElementById('predictive-text').innerText;
        doc.text(doc.splitTextToSize(interpretacion, 180), 14, 91);

        doc.save(`Reporte_Psicocriminal_Zacatecas_${new Date().toISOString().split('T')[0]}.pdf`);
    });

    initMap();
    fetchIntelligenceData();
});