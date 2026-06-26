import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import logoAvalon from './assets/logo-avalon.jpg';
import './styles.css';

const EMPRESA = 'Grupo Avalon Huelva S.L.';
const CIF = 'B13976824';
const IBAN = 'ES77 2100 7174 1002 0016 8101';

const euros = (n) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(n || 0));

const fechaFormato = (value) => {
  if (!value) return '';
  const [anio, mes, dia] = value.split('-');
  return `${dia}/${mes}/${anio}`;
};

function formatearMiles(valor) {
  let limpio = String(valor || '')
    .replace(/[^\d,]/g, '') // permite números y coma
    .replace(/,(?=.*?,)/g, ''); // evita varias comas

  const partes = limpio.split(',');

  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return partes.join(',');
}

function quitarFormato(valor) {
  return Number(String(valor || '').replace(/\./g, '').replace(',', '.')) || 0;
}

function App() {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    direccion: '',
    comprador: '',
    valorVenta: '',
    partidas: [
      { concepto: 'Reserva', importe: '' },
      { concepto: 'Arras', importe: '' }
    ],
    gastos: [],
    observaciones: ''
  });

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function updatePartida(index, key, value) {
    setForm(prev => {
      const partidas = [...prev.partidas];
      partidas[index] = { ...partidas[index], [key]: value };
      return { ...prev, partidas };
    });
  }

  function addPartida() {
    setForm(prev => ({
      ...prev,
      partidas: [...prev.partidas, { concepto: '', importe: '' }]
    }));
  }

  function removePartida(index) {
    setForm(prev => ({
      ...prev,
      partidas: prev.partidas.filter((_, i) => i !== index)
    }));
  }

  function updateGasto(index, key, value) {
    setForm(prev => {
      const gastos = [...prev.gastos];
      gastos[index] = { ...gastos[index], [key]: value };
      return { ...prev, gastos };
    });
  }

  function addGasto() {
    setForm(prev => ({
      ...prev,
      gastos: [...prev.gastos, { concepto: '', importe: '' }]
    }));
  }

  function removeGasto(index) {
    setForm(prev => ({
      ...prev,
      gastos: prev.gastos.filter((_, i) => i !== index)
    }));
  }

  const calculos = useMemo(() => {
    const valorVenta = quitarFormato(form.valorVenta);
    const totalPartidas = form.partidas.reduce((acc, p) => acc + quitarFormato(p.importe), 0);
    const totalGastos = form.gastos.reduce((acc, g) => acc + quitarFormato(g.importe), 0);
    const diferencia = valorVenta - totalPartidas;
    const totalOperacion = valorVenta + totalGastos;

    return {
      valorVenta,
      totalPartidas,
      totalGastos,
      diferencia,
      totalOperacion,
      cuadra: valorVenta > 0 && diferencia.toFixed(2) === '0.00'
    };
  }, [form.valorVenta, form.partidas, form.gastos]);

  function addLogoToPDF(doc) {
    try {
      doc.addImage(logoAvalon, 'JPEG', 18, 12, 72, 26);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('AVALON', 20, 22);
    }
  }

  function pintarFooter(doc, margin, pageWidth) {
    const footerY = 270;

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0);
    doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(EMPRESA, margin, footerY);

    doc.setFont('helvetica', 'normal');
    doc.text(`CIF: ${CIF}`, margin, footerY + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('IBAN:', margin, footerY + 14);
    doc.text(IBAN, margin + 14, footerY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
    doc.text(`Página ${pageNumber}`, pageWidth - margin, 290, { align: 'right' });
  }

  function asegurarEspacio(doc, y, alturaNecesaria, margin, pageWidth) {
    const limiteContenido = 252; // deja libre el bloque inferior de empresa/CIF/IBAN

    if (y + alturaNecesaria > limiteContenido) {
      pintarFooter(doc, margin, pageWidth);
      doc.addPage();
      return 18;
    }

    return y;
  }

  function pintarTabla(doc, titulo, filas, y, margin, pageWidth) {
    const tableW = pageWidth - margin * 2;
    const conceptW = tableW - 45;
    const amountW = 45;
    const rowH = 8;

    y = asegurarEspacio(doc, y, 20 + filas.length * rowH, margin, pageWidth);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(titulo, margin, y);
    y += 7;

    doc.setFillColor(30, 30, 30);
    doc.rect(margin, y, tableW, rowH, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('CONCEPTO', margin + 4, y + 5.5);
    doc.text('IMPORTE', margin + conceptW + amountW - 4, y + 5.5, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    y += rowH;

    filas.forEach((p, index) => {
      y = asegurarEspacio(doc, y, rowH + 8, margin, pageWidth);

      doc.setFillColor(index % 2 === 0 ? 250 : 242, index % 2 === 0 ? 250 : 242, index % 2 === 0 ? 250 : 242);
      doc.rect(margin, y, tableW, rowH, 'F');
      doc.setDrawColor(225);
      doc.rect(margin, y, tableW, rowH);

      doc.setFont('helvetica', 'normal');
      const conceptoLines = doc.splitTextToSize(p.concepto || 'Sin concepto', conceptW - 8);
      doc.text(conceptoLines.slice(0, 1), margin + 4, y + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.text(euros(quitarFormato(p.importe)), margin + conceptW + amountW - 4, y + 5.5, { align: 'right' });

      y += rowH;
    });

    return y + 8;
  }

  function generarPDF() {
    if (!calculos.cuadra) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    let y = 16;

    addLogoToPDF(doc);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('CUADRE DE CANTIDADES', pageWidth - margin, y + 6, { align: 'right' });

    doc.setFontSize(11);
    doc.text('OPERACIÓN DE COMPRAVENTA', pageWidth - margin, y + 13, { align: 'right' });

    y = 48;
    doc.setDrawColor(0);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 36, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Fecha:', margin + 6, y + 9);
    doc.text('Comprador:', margin + 6, y + 18);
    doc.text('Dirección del inmueble:', margin + 6, y + 27);

    doc.setFont('helvetica', 'bold');
    doc.text(fechaFormato(form.fecha), margin + 45, y + 9);
    doc.text(form.comprador || '________________', margin + 45, y + 18);

    const direccionLines = doc.splitTextToSize(form.direccion || '________________', 120);
    doc.text(direccionLines, margin + 45, y + 27);

    y += 48;

    doc.setFillColor(0, 0, 0);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('VALOR DE VENTA', margin + 8, y + 9);

    doc.setFontSize(18);
    doc.text(euros(calculos.valorVenta), pageWidth - margin - 8, y + 14, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    y += 34;

    y = pintarTabla(doc, 'DESGLOSE DEL VALOR DE LA VIVIENDA', form.partidas, y, margin, pageWidth);

    if (form.gastos.some(g => quitarFormato(g.importe) > 0 || g.concepto.trim())) {
      y = pintarTabla(doc, 'GASTOS ADICIONALES A LA OPERACIÓN', form.gastos, y, margin, pageWidth);
    }

    const tableW = pageWidth - margin * 2;

    y = asegurarEspacio(doc, y, 34, margin, pageWidth);

    doc.setDrawColor(0);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, tableW, 34, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Valor de venta:', margin + 6, y + 9);
    doc.text('Total desglosado vivienda:', margin + 6, y + 17);
    doc.text('Gastos adicionales:', margin + 6, y + 25);

    doc.setFont('helvetica', 'bold');
    doc.text(euros(calculos.valorVenta), pageWidth - margin - 8, y + 9, { align: 'right' });
    doc.text(euros(calculos.totalPartidas), pageWidth - margin - 8, y + 17, { align: 'right' });
    doc.text(euros(calculos.totalGastos), pageWidth - margin - 8, y + 25, { align: 'right' });

    y += 43;

    y = asegurarEspacio(doc, y, 16, margin, pageWidth);

    doc.setFillColor(0, 0, 0);
    doc.roundedRect(margin, y, tableW, 16, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL OPERACIÓN', margin + 6, y + 10.5);
    doc.text(euros(calculos.totalOperacion), pageWidth - margin - 8, y + 10.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    y += 25;

    if (form.observaciones.trim()) {
      y = asegurarEspacio(doc, y, 35, margin, pageWidth);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Observaciones:', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const obsLines = doc.splitTextToSize(form.observaciones, tableW);
      doc.text(obsLines.slice(0, 6), margin, y);
    }

    pintarFooter(doc, margin, pageWidth);

    doc.save(`cuadre-cantidades-${form.comprador || 'avalon'}.pdf`);
  }

  const estadoTexto = calculos.cuadra
    ? 'OPERACIÓN CUADRADA'
    : calculos.diferencia > 0
      ? `FALTAN ${euros(calculos.diferencia)}`
      : `SOBRAN ${euros(Math.abs(calculos.diferencia))}`;

  return (
    <main>
      <header className="topbar">
        <img src={logoAvalon} alt="Avalon Grupo Inmobiliario" />
        <div>
          <h1>Cuadre de Cantidades</h1>
          <p>Generador de PDF para operaciones de compraventa</p>
        </div>
      </header>

      <section className="card">
        <h2>Datos de la operación</h2>

        <div className="grid">
          <label>Fecha
  <input type="date" value={form.fecha} onChange={e => update('fecha', e.target.value)} />
          </label>

          <label>Comprador
            <input value={form.comprador} onChange={e => update('comprador', e.target.value)} placeholder="Nombre del comprador" />
          </label>
        </div>

        <label>Dirección del inmueble
          <input value={form.direccion} onChange={e => update('direccion', e.target.value)} placeholder="Dirección del inmueble" />
        </label>

        <label>Valor de venta
          <input
            className="importe-input"
            type="text"
            inputMode="numeric"
            value={form.valorVenta}
            onChange={e => update('valorVenta', formatearMiles(e.target.value))}
            placeholder="250.000"
          />
        </label>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Desglose del valor de la vivienda</h2>
          <button type="button" onClick={addPartida}>+ Añadir partida</button>
        </div>

        <div className="tabla">
          <div className="tabla-head">
            <span>Concepto</span>
            <span>Importe</span>
            <span></span>
          </div>

          {form.partidas.map((p, i) => (
            <div className="tabla-row" key={i}>
              <input value={p.concepto} onChange={e => updatePartida(i, 'concepto', e.target.value)} placeholder="Ej. Reserva, arras, hipoteca..." />

              <input
                type="text"
                inputMode="numeric"
                value={p.importe}
                onChange={e => updatePartida(i, 'importe', formatearMiles(e.target.value))}
                placeholder="0"
              />

              <button type="button" className="danger" onClick={() => removePartida(i)} disabled={form.partidas.length <= 1}>Eliminar</button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Gastos adicionales</h2>
          <button type="button" onClick={addGasto}>+ Añadir gasto</button>
        </div>

        <div className="tabla">
          <div className="tabla-head">
            <span>Concepto</span>
            <span>Importe</span>
            <span></span>
          </div>

          {form.gastos.map((g, i) => (
            <div className="tabla-row" key={i}>
              <input value={g.concepto} onChange={e => updateGasto(i, 'concepto', e.target.value)} placeholder="Ej. Notaría, registro, gestoría, honorarios..." />

              <input
                type="text"
                inputMode="numeric"
                value={g.importe}
                onChange={e => updateGasto(i, 'importe', formatearMiles(e.target.value))}
                placeholder="0"
              />

              <button type="button" className="danger" onClick={() => removeGasto(i)}>Eliminar</button>
            </div>
          ))}
        </div>
      </section>

      <section className="resumen">
        <div>
          <span>Valor venta</span>
          <strong>{euros(calculos.valorVenta)}</strong>
        </div>

        <div>
          <span>Total vivienda</span>
          <strong>{euros(calculos.totalPartidas)}</strong>
        </div>

        <div className={calculos.cuadra ? 'ok' : 'error'}>
          <span>Diferencia</span>
          <strong>{euros(calculos.diferencia)}</strong>
        </div>

        <div>
          <span>Gastos</span>
          <strong>{euros(calculos.totalGastos)}</strong>
        </div>

        <div>
          <span>Total operación</span>
          <strong>{euros(calculos.totalOperacion)}</strong>
        </div>
      </section>

      <section className={`estado ${calculos.cuadra ? 'ok' : 'error'}`}>
        {estadoTexto}
      </section>

      <section className="card">
        <h2>Datos corporativos</h2>
        <p><strong>{EMPRESA}</strong></p>
        <p>CIF: {CIF}</p>
        <p>IBAN: <strong>{IBAN}</strong></p>
      </section>

      <section className="card">
        <h2>Observaciones</h2>
        <textarea
          rows="4"
          value={form.observaciones}
          onChange={e => update('observaciones', e.target.value)}
          placeholder="Notas opcionales para el PDF..."
        />
      </section>

      <button className="generar" onClick={generarPDF} disabled={!calculos.cuadra}>
        Generar PDF
      </button>

      {!calculos.cuadra && (
        <p className="aviso">
          El PDF solo se puede generar cuando el total del desglose de la vivienda coincida exactamente con el valor de venta.
          Los gastos adicionales van aparte y no afectan al cuadre del valor de la vivienda.
        </p>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
