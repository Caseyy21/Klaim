import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-multi-date-picker';
import "react-multi-date-picker/styles/colors/teal.css";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabase = createClient('https://rikaxdbockyepmyngwnx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpa2F4ZGJvY2t5ZXBteW5nd254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5Mjk2ODcsImV4cCI6MjA2NDUwNTY4N30.l-DlHRyjnGfM0tx_2WJkZOgaWJeFC8t4ou78qoAj2Sk');

const App = () => {
  const [options, setOptions] = useState([]);
  const [tanggal, setTanggal] = useState([]);
  const [item, setItem] = useState('');
  const [harga, setHarga] = useState('');
  const [data, setData] = useState({ bbm: [], tol: [], parkir: [] });
  const [newOption, setNewOption] = useState({ nama: '', tipe: '', harga: '' });
  const [inputTipe, setInputTipe] = useState('');
  const [inputNama, setInputNama] = useState('');
  const [inputHarga, setInputHarga] = useState('');
  const [printTitle, setPrintTitle] = useState('Judul Print');
  const printRef = useRef();

  // Fetch options from Supabase
  useEffect(() => {
    const fetchOptions = async () => {
      const { data, error } = await supabase.from('options').select('*');
      if (!error) setOptions(data);
    };
    fetchOptions();
  }, []);

  // Fetch biaya data from Supabase
  useEffect(() => {
    const fetchBiaya = async () => {
      const { data: biaya, error } = await supabase.from('biaya').select('*');
      if (!error) {
        const grouped = { bbm: [], tol: [], parkir: [] };
        biaya.forEach(row => {
          if (grouped[row.tipe]) grouped[row.tipe].push(row);
        });
        setData(grouped);
      }
    };
    fetchBiaya();
  }, []);

  const handleItemChange = (e) => {
    const selectedNama = e.target.value;
    const selected = options.find(opt => opt.nama === selectedNama);
    setItem(selectedNama);
    if (selected && selected.tipe === 'tol') {
      setHarga(selected.harga || '');
    } else {
      setHarga(''); // allow user to input harga for parkir and bbm
    }
  };

  const handleTipeChange = (e) => {
    setInputTipe(e.target.value);
    setInputNama('');
    setInputHarga('');
  };

  const handleTolNamaChange = (e) => {
    const selectedNama = e.target.value;
    setInputNama(selectedNama);
    const selected = options.find(opt => opt.nama === selectedNama && opt.tipe === 'tol');
    setInputHarga(selected ? selected.harga : '');
  };

  const handleAdd = async () => {
    if (!inputTipe) return;
    if (inputTipe === 'tol') {
      if (!inputNama || !inputHarga || !tanggal.length) return;
    } else {
      if (!inputNama || !inputHarga || !tanggal.length) return;
    }
    const entries = tanggal.map(tgl => ({
      tanggal: tgl.format("YYYY-MM-DD"),
      nama: inputNama,
      tipe: inputTipe,
      harga: parseFloat(inputHarga)
    }));
    const { error } = await supabase.from('biaya').insert(entries);
    if (!error) {
      // Refresh data
      const { data: biaya } = await supabase.from('biaya').select('*');
      const grouped = { bbm: [], tol: [], parkir: [] };
      biaya.forEach(row => {
        if (grouped[row.tipe]) grouped[row.tipe].push(row);
      });
      setData(grouped);
      setInputTipe('');
      setInputNama('');
      setInputHarga('');
      setTanggal([]);
    }
  };

  // Add new option to Supabase
  const handleAddOption = async () => {
    if (!newOption.nama || !newOption.tipe) return;
    const payload = {
      nama: newOption.nama,
      tipe: newOption.tipe,
      harga: newOption.tipe === 'tol' ? parseFloat(newOption.harga) || 0 : null
    };
    const { error } = await supabase.from('options').insert([payload]);
    if (!error) {
      // Refresh options
      const { data: updatedOptions } = await supabase.from('options').select('*');
      setOptions(updatedOptions);
      setNewOption({ nama: '', tipe: '', harga: '' });
    }
  };

  // Sort by price, then by date
  const getSortedData = (tipe) => {
    return [...data[tipe]].sort((a, b) => {
      if (a.harga !== b.harga) return a.harga - b.harga;
      return new Date(a.tanggal) - new Date(b.tanggal);
    });
  };

  const renderTable = (tipe) => {
    const sortedData = getSortedData(tipe);
    const total = sortedData.reduce((sum, item) => sum + item.harga, 0);

    return (
      <div>
        <h3 style={{textAlign:'center'}}>{tipe.toUpperCase()}</h3>
        <table border="1" cellPadding="5" style={{width:'100%', marginBottom: 10}}>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Nama</th>
              <th>Harga</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((entry, index) => (
              <tr key={index}>
                <td>{entry.tanggal}</td>
                <td>{entry.nama}</td>
                <td>{entry.harga.toLocaleString()}</td>
              </tr>
            ))}
            <tr>
              <td colSpan="2"><strong>Total</strong></td>
              <td><strong>{total.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderSummary = () => {
    const summary = Object.keys(data).map(tipe => {
      const jumlahItem = data[tipe].length;
      const totalHarga = data[tipe].reduce((sum, item) => sum + item.harga, 0);
      return { tipe, jumlahItem, totalHarga };
    });

    const totalKeseluruhan = summary.reduce((sum, s) => sum + s.totalHarga, 0);

    return (
      <div>
        <h3 style={{textAlign:'center'}}>KETERANGAN</h3>
        <table border="1" cellPadding="5" style={{width:'100%'}}>
          <thead>
            <tr>
              <th>Tipe</th>
              <th>Jumlah Item</th>
              <th>Total Harga</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s, idx) => (
              <tr key={idx}>
                <td>{s.tipe.toUpperCase()}</td>
                <td>{s.jumlahItem} item</td>
                <td>{s.totalHarga.toLocaleString()}</td>
              </tr>
            ))}
            <tr>
              <td><strong>TOTAL</strong></td>
              <td></td>
              <td><strong>{totalKeseluruhan.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Export to Excel
  const handleExportExcel = () => {
    const sheetData = [
      ["TOL"], ["Tanggal", "Nama", "Harga"],
      ...getSortedData('tol').map(e => [e.tanggal, e.nama, e.harga]),
      [""], ["PARKIR"], ["Tanggal", "Nama", "Harga"],
      ...getSortedData('parkir').map(e => [e.tanggal, e.nama, e.harga]),
      [""], ["BBM"], ["Tanggal", "Nama", "Harga"],
      ...getSortedData('bbm').map(e => [e.tanggal, e.nama, e.harga]),
      [""], ["KETERANGAN"], ["Tipe", "Jumlah Item", "Total Harga"],
      ...Object.keys(data).map(tipe => [
        tipe.toUpperCase(),
        data[tipe].length + " item",
        data[tipe].reduce((sum, item) => sum + item.harga, 0)
      ]),
      ["TOTAL", "", Object.keys(data).reduce((sum, tipe) => sum + data[tipe].reduce((s, i) => s + i.harga, 0), 0)]
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "data-biaya.xlsx");
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'Arial',
        minHeight: '100vh',
        backgroundImage: 'url(https://i.pinimg.com/1200x/c6/7d/ad/c67dad67d82b4477d9c41879f7a44d71.jpg)',
        backgroundRepeat: 'repeat',
        backgroundSize: '300px',
      }}
    >
      <h1>Aplikasi Klaim buat Casey :D</h1>
      {/* Print & Export Buttons */}
      <div style={{marginBottom: 20, display: 'flex', gap: 10}}>
        <button onClick={handleExportExcel}>Export to Excel</button>
        <button onClick={handlePrint}>Print</button>
      </div>
      {/* Form - Hide on print */}
      <div className="no-print">
        <h2>Form Input Biaya</h2>
        {/* Print Title Input */}
        <div style={{marginBottom: 20}}>
          <label>Judul Print: </label>
          <input
            type="text"
            value={printTitle}
            onChange={e => setPrintTitle(e.target.value)}
            placeholder="Judul Print"
            style={{width: 300}}
          />
        </div>
        {/* Add Option Form */}
        <div style={{marginBottom: 20, border: '1px solid #ccc', padding: 10, borderRadius: 6}}>
          <h3>Tambah Pilihan Item</h3>
          <div style={{display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'}}>
            <input
              type="text"
              placeholder="Nama"
              value={newOption.nama}
              onChange={e => setNewOption(opt => ({ ...opt, nama: e.target.value }))}
            />
            <select
              value={newOption.tipe}
              onChange={e => setNewOption(opt => ({ ...opt, tipe: e.target.value }))}
            >
              <option value="">-- Pilih Tipe --</option>
              <option value="bbm">BBM</option>
              <option value="tol">TOL</option>
              <option value="parkir">PARKIR</option>
            </select>
            {newOption.tipe === 'tol' && (
              <input
                type="number"
                placeholder="Harga (khusus tol)"
                value={newOption.harga}
                onChange={e => setNewOption(opt => ({ ...opt, harga: e.target.value }))}
                style={{width: 120}}
              />
            )}
            <button type="button" onClick={handleAddOption}>Tambah Option</button>
          </div>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Tanggal (multi select): </label><br />
          <DatePicker
            multiple
            value={tanggal}
            onChange={setTanggal}
            format="YYYY-MM-DD"
            className="teal"
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Tipe: </label>
          <select value={inputTipe} onChange={handleTipeChange}>
            <option value="">-- Pilih Tipe --</option>
            <option value="bbm">BBM</option>
            <option value="tol">TOL</option>
            <option value="parkir">PARKIR</option>
          </select>
        </div>
        {inputTipe === 'tol' && (
          <div style={{ marginBottom: '10px' }}>
            <label>Nama Tol: </label>
            <select value={inputNama} onChange={handleTolNamaChange}>
              <option value="">-- Pilih Tol --</option>
              {options.filter(opt => opt.tipe === 'tol').map((opt, idx) => (
                <option key={idx} value={opt.nama}>{opt.nama}</option>
              ))}
            </select>
            <div>
              <label>Harga: </label>
              <input type="number" value={inputHarga} disabled readOnly />
            </div>
          </div>
        )}
        {(inputTipe === 'bbm' || inputTipe === 'parkir') && (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label>Nama: </label>
              <input
                type="text"
                value={inputNama}
                onChange={e => setInputNama(e.target.value)}
                placeholder={`Nama ${inputTipe.toUpperCase()}`}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Harga: </label>
              <input
                type="number"
                value={inputHarga}
                onChange={e => setInputHarga(e.target.value)}
                placeholder="Harga"
              />
            </div>
          </>
        )}
        <button onClick={handleAdd}>Add</button>
      </div>
      {/* Print Title (only visible in print) */}
      <div className="print-title" style={{display: 'none', textAlign: 'center', margin: 0, padding: 0}}>
        <h1 style={{margin: 0, fontSize: '2.2rem', fontWeight: 900}}>{printTitle}</h1>
      </div>
      {/* Tables Layout */}
      <div
        ref={printRef}
        className="tables-area"
      >
        <div className="tables-col">
          {renderTable('tol')}
          {renderSummary()}
        </div>
        <div className="tables-col">
          {renderTable('parkir')}
          {renderTable('bbm')}
        </div>
      </div>
      {/* Print Styles and App Styles */}
      <style>{`
        body {
          background: none !important;
        }
        .no-print {
          background: rgba(255,255,255,0.85);
          border-radius: 16px;
          box-shadow: 0 4px 24px 0 #b6c6e6;
          padding: 24px 32px;
          margin-bottom: 32px;
          border: 2px solid #e3e8fa;
        }
        h2, h3 {
          color: #2d3559;
          font-family: 'Quicksand', 'Segoe UI', sans-serif;
          font-weight: 700;
          letter-spacing: 1px;
        }
        label {
          color: #3a4374;
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 4px;
          display: inline-block;
        }
        input, select {
          border: 1.5px solid #b6c6e6;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 1rem;
          background: #fff;
          margin-top: 4px;
          margin-bottom: 8px;
          transition: border 0.2s;
          outline: none;
        }
        input:focus, select:focus {
          border: 1.5px solid #4e5ba6;
          background: #f0f4ff;
        }
        button {
          background: linear-gradient(90deg, #4e5ba6 60%, #a3bffa 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 22px;
          font-size: 1rem;
          font-weight: 700;
          margin-top: 8px;
          margin-right: 8px;
          cursor: pointer;
          box-shadow: 0 2px 8px #b6c6e6;
          transition: background 0.2s, transform 0.1s;
        }
        button:hover {
          background: linear-gradient(90deg, #3a4374 60%, #7f9cf5 100%);
          transform: translateY(-2px) scale(1.03);
        }
        .tables-area {
          background: rgba(255,255,255,0.85);
          border-radius: 18px;
          box-shadow: 0 4px 24px 0 #b6c6e6;
          padding: 24px 32px;
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
          align-items: stretch;
        }
        .tables-col {
          flex: 1 1 350px;
          min-width: 300px;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        table {
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px #e3e8fa;
          margin-bottom: 18px;
        }
        th, td {
          padding: 10px 14px;
          text-align: center;
          font-size: 1rem;
          color: #222;
          background: #fff;
          border: 1px solid #222;
        }
        th {
          background: #fff;
          color: #111;
          font-weight: 700;
          letter-spacing: 1px;
          border-bottom: 2px solid #222;
        }
        tr:last-child td {
          border-bottom: none;
        }
        tr:nth-child(even) td {
          background: #f7f7f7;
        }
        tr:last-child {
          background: #f2f2f2;
          font-weight: 700;
          color: #111;
        }
        /* Remove pink accent for totals and summary, keep it black/white */
        tr:last-child td, .tables-area h3, .tables-area h2 {
          background: #fff !important;
          color: #111 !important;
        }
        /* Responsive */
        @media (max-width: 900px) {
          .tables-area {
            flex-direction: column !important;
            padding: 12px 4px;
          }
          .tables-col {
            max-width: 100% !important;
            min-width: 0 !important;
          }
        }
        /* Print styles */
        @media print {
          html, body {
            background: none !important;
          }
          body * { visibility: hidden; }
          .tables-area, .tables-area * {
            visibility: visible !important;
          }
          .tables-area {
            position: absolute;
            left: 0; right: 0; top: 60px;
            margin: auto;
            width: 98vw;
            min-width: 440px;
            max-width: 700px;
            display: flex !important;
            flex-direction: row !important;
            justify-content: center !important;
            align-items: flex-start !important;
            gap: 10px !important;
            background: #fff !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .tables-col {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            min-width: 220px !important;
            max-width: 340px !important;
          }
          .print-title {
            display: block !important;
            position: absolute;
            top: 10px;
            left: 0;
            right: 0;
            text-align: center;
            z-index: 9999;
            font-size: 1.3rem;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          button { display: none !important; }
          table, th, td {
            background: #fff !important;
            color: #111 !important;
            border: 1.2px solid #111 !important;
            font-size: 0.93rem !important;
          }
          th {
            background: #fff !important;
            color: #111 !important;
          }
          tr:last-child, tr:last-child td {
            background: #fff !important;
            color: #111 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;