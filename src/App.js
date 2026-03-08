import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

const TEACHER_PIN = "1234";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function displayDate(str) {
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

async function sget(key) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
async function sset(key, val) {
  try {
    await window.storage.set(key, JSON.stringify(val));
  } catch {}
}
async function slist(prefix) {
  try {
    const r = await window.storage.list(prefix);
    return r?.keys ?? [];
  } catch {
    return [];
  }
}

function Btn({
  children,
  onClick,
  color = "#2ecc71",
  outline = false,
  small = false,
  disabled = false,
  style = {},
}) {
  const base = {
    padding: small ? "7px 14px" : "13px 20px",
    borderRadius: 10,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: small ? 13 : 15,
    border: "none",
    transition: "opacity .2s",
    opacity: disabled ? 0.5 : 1,
    ...style,
  };
  if (outline)
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          ...base,
          background: "transparent",
          border: `2px solid ${color}`,
          color,
        }}
      >
        {children}
      </button>
    );
  const grad = {
    "#2ecc71": "linear-gradient(135deg,#2ecc71,#27ae60)",
    "#3498db": "linear-gradient(135deg,#3498db,#2980b9)",
    "#e74c3c": "linear-gradient(135deg,#e74c3c,#c0392b)",
    "#f39c12": "linear-gradient(135deg,#f39c12,#e67e22)",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, background: grad[color] || color, color: "#fff" }}
    >
      {children}
    </button>
  );
}

function CourseManager({ courses, onCoursesChange, onBack }) {
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(null);
  const [msg, setMsg] = useState("");
  const fileRefs = useRef({});

  const addCourse = async () => {
    const name = newName.trim();
    if (!name || courses[name]) return;
    const updated = { ...courses, [name]: [] };
    await sset("courses", updated);
    onCoursesChange(updated);
    setNewName("");
  };

  const deleteCourse = async (name) => {
    if (!confirm(`¿Eliminar el curso "${name}" y toda su asistencia?`)) return;
    const updated = { ...courses };
    delete updated[name];
    await sset("courses", updated);
    const keys = await slist(`att_${name}_`);
    for (const k of keys) {
      try {
        await window.storage.delete(k);
      } catch {}
    }
    onCoursesChange(updated);
  };

  const handleFile = async (courseName, file) => {
    setUploading(courseName);
    setMsg("");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      let names = rows.map((r) => String(r[0] ?? "").trim()).filter(Boolean);
      if (names[0] && /nombre|alumno|apellido|estudiante/i.test(names[0]))
        names = names.slice(1);
      if (!names.length) {
        setMsg("No se encontraron nombres.");
        setUploading(null);
        return;
      }
      const updated = { ...courses, [courseName]: names };
      await sset("courses", updated);
      onCoursesChange(updated);
      setMsg(`✓ ${names.length} alumnos cargados en "${courseName}"`);
    } catch {
      setMsg("Error al leer el archivo.");
    }
    setUploading(null);
  };

  return (
    <div style={{ padding: 16 }}>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "#3498db",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          marginBottom: 16,
          padding: 0,
        }}
      >
        ← Volver
      </button>
      <div
        style={{
          fontFamily: "'Space Mono',monospace",
          fontSize: 11,
          color: "#f39c12",
          letterSpacing: 3,
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        Gestión de cursos
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 20 }}>
        📚 Mis Cursos
      </div>

      <div
        style={{
          background: "#1a1f2e",
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
          border: "1px solid rgba(243,156,18,.2)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#f39c12",
            marginBottom: 10,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Agregar curso
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCourse()}
            placeholder="ej: 3ro C"
            style={{
              flex: 1,
              background: "#252b3b",
              border: "1px solid rgba(255,255,255,.1)",
              color: "#f0f0f0",
              borderRadius: 9,
              padding: "10px 12px",
              fontSize: 15,
            }}
          />
          <Btn onClick={addCourse} color="#f39c12" small>
            Crear
          </Btn>
        </div>
      </div>

      {msg && (
        <div
          style={{
            background: "rgba(46,204,113,.12)",
            border: "1px solid rgba(46,204,113,.3)",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#2ecc71",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          {msg}
        </div>
      )}

      {Object.keys(courses).length === 0 ? (
        <div style={{ textAlign: "center", color: "#444", marginTop: 40 }}>
          No hay cursos todavía.
          <br />
          Creá uno arriba ↑
        </div>
      ) : (
        Object.entries(courses).map(([name, students]) => (
          <div
            key={name}
            style={{
              background: "#1a1f2e",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              border: "1px solid rgba(255,255,255,.07)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{name}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: students.length ? "#2ecc71" : "#e74c3c",
                  }}
                >
                  {students.length
                    ? `${students.length} alumnos cargados`
                    : "Sin lista de alumnos"}
                </div>
              </div>
              <Btn
                onClick={() => deleteCourse(name)}
                color="#e74c3c"
                outline
                small
              >
                Eliminar
              </Btn>
            </div>
            <input
              key={name}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              ref={(el) => (fileRefs.current[name] = el)}
              onChange={(e) => {
                if (e.target.files[0]) handleFile(name, e.target.files[0]);
                e.target.value = "";
              }}
            />
            <Btn
              onClick={() => fileRefs.current[name]?.click()}
              color="#3498db"
              small
              disabled={uploading === name}
              style={{ width: "100%" }}
            >
              {uploading === name
                ? "Procesando..."
                : students.length
                ? "↑ Reemplazar lista (.xlsx / .csv)"
                : "↑ Subir lista de alumnos (.xlsx / .csv)"}
            </Btn>
            {students.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 5,
                }}
              >
                {students.slice(0, 6).map((s) => (
                  <span
                    key={s}
                    style={{
                      background: "rgba(255,255,255,.06)",
                      borderRadius: 6,
                      padding: "3px 8px",
                      fontSize: 12,
                      color: "#aaa",
                    }}
                  >
                    {s}
                  </span>
                ))}
                {students.length > 6 && (
                  <span
                    style={{ fontSize: 12, color: "#555", padding: "3px 4px" }}
                  >
                    +{students.length - 6} más
                  </span>
                )}
              </div>
            )}
          </div>
        ))
      )}

      <div
        style={{
          background: "#1a1f2e",
          borderRadius: 12,
          padding: 14,
          marginTop: 8,
          border: "1px solid rgba(255,255,255,.05)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "#555",
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          💡 Formato del archivo
        </div>
        <div style={{ fontSize: 12, color: "#444", lineHeight: 1.7 }}>
          Una columna con los nombres, un alumno por fila.
          <br />
          Podés incluir encabezado ("Nombre") o no, se detecta automáticamente.
        </div>
      </div>
    </div>
  );
}

function TeacherApp({ onLogout }) {
  const [courses, setCourses] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [attendance, setAttendance] = useState({});
  const [view, setView] = useState("take");
  const [saved, setSaved] = useState(false);
  const [managingCourses, setManagingCourses] = useState(false);
  const [historyData, setHistoryData] = useState({});

  useEffect(() => {
    (async () => {
      const c = await sget("courses");
      if (c && Object.keys(c).length) {
        setCourses(c);
        setSelectedClass(Object.keys(c)[0]);
      } else setManagingCourses(true);
    })();
  }, []);

  const handleCoursesChange = (updated) => {
    setCourses(updated);
    if (!selectedClass || !updated[selectedClass])
      setSelectedClass(Object.keys(updated)[0] ?? null);
  };

  const storageKey = selectedClass
    ? `att_${selectedClass}_${selectedDate}`
    : null;

  useEffect(() => {
    if (!selectedClass || !courses[selectedClass]) return;
    (async () => {
      const s = await sget(storageKey);
      if (s) setAttendance(s);
      else {
        const init = {};
        courses[selectedClass].forEach((st) => (init[st] = null));
        setAttendance(init);
      }
      setSaved(false);
    })();
  }, [selectedClass, selectedDate]);

  useEffect(() => {
    if (view !== "history" || !selectedClass) return;
    (async () => {
      const keys = await slist(`att_${selectedClass}_`);
      const data = {};
      for (const k of keys) {
        const r = await sget(k);
        if (r) data[k.replace(`att_${selectedClass}_`, "")] = r;
      }
      setHistoryData(data);
    })();
  }, [view, selectedClass]);

  const toggle = (s) => {
    setAttendance((prev) => ({
      ...prev,
      [s]: prev[s] === null ? "P" : prev[s] === "P" ? "A" : null,
    }));
    setSaved(false);
  };
  const markAll = (val) => {
    const n = {};
    (courses[selectedClass] || []).forEach((s) => (n[s] = val));
    setAttendance(n);
    setSaved(false);
  };
  const saveAtt = async () => {
    await sset(storageKey, attendance);
    setSaved(true);
  };

  const students = (selectedClass && courses[selectedClass]) || [];
  const present = Object.values(attendance).filter((v) => v === "P").length;
  const absent = Object.values(attendance).filter((v) => v === "A").length;
  const pending = Object.values(attendance).filter((v) => v === null).length;

  const hdr = (accent, title, subtitle) => (
    <div
      style={{
        background: "linear-gradient(135deg,#1a1f2e,#252b3b)",
        borderBottom: `2px solid ${accent}`,
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "'Space Mono',monospace",
            fontSize: 11,
            color: accent,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {subtitle}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>{title}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {!managingCourses && (
          <button
            onClick={() => setManagingCourses(true)}
            style={{
              background: "rgba(243,156,18,.12)",
              border: "1px solid rgba(243,156,18,.3)",
              color: "#f39c12",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ⚙️ Cursos
          </button>
        )}
        <button
          onClick={onLogout}
          style={{
            background: "rgba(255,255,255,.08)",
            border: "1px solid rgba(255,255,255,.15)",
            color: "#aaa",
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Salir
        </button>
      </div>
    </div>
  );

  if (managingCourses)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f1117",
          color: "#f0f0f0",
          fontFamily: "'Nunito',sans-serif",
          paddingBottom: 40,
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&family=Space+Mono:wght@700&display=swap"
          rel="stylesheet"
        />
        {hdr("#f39c12", "⚙️ Configuración", "Modo Profesora")}
        <CourseManager
          courses={courses}
          onCoursesChange={handleCoursesChange}
          onBack={() => {
            if (Object.keys(courses).length) setManagingCourses(false);
          }}
        />
      </div>
    );

  const sortedDates = Object.keys(historyData).sort((a, b) =>
    b.localeCompare(a)
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1117",
        color: "#f0f0f0",
        fontFamily: "'Nunito',sans-serif",
        paddingBottom: 40,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&family=Space+Mono:wght@700&display=swap"
        rel="stylesheet"
      />
      {hdr("#2ecc71", "📋 Asistencia", "Modo Profesora")}

      <div style={{ padding: "16px 16px 0" }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {Object.keys(courses).map((c) => (
            <button
              key={c}
              onClick={() => setSelectedClass(c)}
              style={{
                flexShrink: 0,
                padding: "8px 18px",
                borderRadius: 20,
                border: "2px solid",
                borderColor:
                  selectedClass === c ? "#2ecc71" : "rgba(255,255,255,.1)",
                background:
                  selectedClass === c
                    ? "rgba(46,204,113,.15)"
                    : "rgba(255,255,255,.04)",
                color: selectedClass === c ? "#2ecc71" : "#888",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 14,
            alignItems: "center",
          }}
        >
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              flex: 1,
              background: "#1a1f2e",
              border: "1px solid rgba(255,255,255,.15)",
              color: "#f0f0f0",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 15,
            }}
          />
          <button
            onClick={() => setView(view === "take" ? "history" : "take")}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.15)",
              background: "rgba(255,255,255,.06)",
              color: "#aaa",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {view === "take" ? "📊 Historial" : "✍️ Tomar"}
          </button>
        </div>
      </div>

      {view === "take" ? (
        <div style={{ padding: 16 }}>
          {students.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: 40, color: "#555" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
              <div>Este curso no tiene alumnos cargados.</div>
              <button
                onClick={() => setManagingCourses(true)}
                style={{
                  marginTop: 12,
                  background: "rgba(243,156,18,.15)",
                  border: "1px solid rgba(243,156,18,.4)",
                  color: "#f39c12",
                  borderRadius: 10,
                  padding: "10px 18px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Subir lista ↑
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {[
                  ["Presentes", present, "#2ecc71"],
                  ["Ausentes", absent, "#e74c3c"],
                  ["Sin marcar", pending, "#f39c12"],
                ].map(([l, v, c]) => (
                  <div
                    key={l}
                    style={{
                      background: "#1a1f2e",
                      borderRadius: 12,
                      padding: "10px 8px",
                      textAlign: "center",
                      border: `1px solid ${c}33`,
                    }}
                  >
                    <div style={{ fontSize: 26, fontWeight: 900, color: c }}>
                      {v}
                    </div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                      {l}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button
                  onClick={() => markAll("P")}
                  style={{
                    flex: 1,
                    padding: "9px",
                    borderRadius: 9,
                    background: "rgba(46,204,113,.12)",
                    border: "1px solid #2ecc71",
                    color: "#2ecc71",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  ✓ Todos presentes
                </button>
                <button
                  onClick={() => markAll(null)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 9,
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)",
                    color: "#666",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Limpiar
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {students.map((student, i) => {
                  const status = attendance[student] ?? null;
                  return (
                    <button
                      key={student}
                      onClick={() => toggle(student)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "14px 16px",
                        borderRadius: 12,
                        background:
                          status === "P"
                            ? "rgba(46,204,113,.12)"
                            : status === "A"
                            ? "rgba(231,76,60,.12)"
                            : "rgba(255,255,255,.04)",
                        border: `2px solid ${
                          status === "P"
                            ? "#2ecc71"
                            : status === "A"
                            ? "#e74c3c"
                            : "rgba(255,255,255,.08)"
                        }`,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all .15s",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background:
                            status === "P"
                              ? "#2ecc71"
                              : status === "A"
                              ? "#e74c3c"
                              : "#333",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 900,
                          color: status ? "#fff" : "#555",
                          flexShrink: 0,
                          marginRight: 12,
                        }}
                      >
                        {status === "P" ? "✓" : status === "A" ? "✗" : i + 1}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          fontWeight: 700,
                          fontSize: 15,
                          color:
                            status === "P"
                              ? "#2ecc71"
                              : status === "A"
                              ? "#e74c3c"
                              : "#ddd",
                        }}
                      >
                        {student}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: 1,
                          color:
                            status === "P"
                              ? "#2ecc71"
                              : status === "A"
                              ? "#e74c3c"
                              : "#444",
                          textTransform: "uppercase",
                        }}
                      >
                        {status === "P"
                          ? "Presente"
                          : status === "A"
                          ? "Ausente"
                          : "—"}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={saveAtt}
                style={{
                  width: "100%",
                  marginTop: 20,
                  padding: "16px",
                  borderRadius: 12,
                  background: saved
                    ? "rgba(46,204,113,.2)"
                    : "linear-gradient(135deg,#2ecc71,#27ae60)",
                  border: saved ? "2px solid #2ecc71" : "none",
                  color: saved ? "#2ecc71" : "#fff",
                  fontSize: 17,
                  fontWeight: 900,
                  cursor: "pointer",
                  transition: "all .3s",
                }}
              >
                {saved ? "✓ Guardado" : "Guardar asistencia"}
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              marginBottom: 14,
              color: "#aaa",
            }}
          >
            Historial — {selectedClass}
          </div>
          {sortedDates.length === 0 ? (
            <div style={{ textAlign: "center", color: "#555", marginTop: 40 }}>
              No hay registros guardados aún.
            </div>
          ) : (
            sortedDates.map((date) => {
              const rec = historyData[date];
              const p = Object.values(rec).filter((v) => v === "P").length;
              const a = Object.values(rec).filter((v) => v === "A").length;
              return (
                <div
                  key={date}
                  style={{
                    background: "#1a1f2e",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                    border: "1px solid rgba(255,255,255,.07)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {displayDate(date)}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ color: "#2ecc71", fontWeight: 700 }}>
                        ✓ {p}
                      </span>
                      <span style={{ color: "#e74c3c", fontWeight: 700 }}>
                        ✗ {a}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(rec)
                      .filter(([, v]) => v === "A")
                      .map(([name]) => (
                        <span
                          key={name}
                          style={{
                            background: "rgba(231,76,60,.15)",
                            border: "1px solid rgba(231,76,60,.3)",
                            color: "#e74c3c",
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: 12,
                          }}
                        >
                          {name.split(" ")[0]}
                        </span>
                      ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function StudentView({ onBack }) {
  const [courses, setCourses] = useState({});
  const [searchName, setSearchName] = useState("");
  const [searchClass, setSearchClass] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await sget("courses");
      if (c) {
        setCourses(c);
        setSearchClass(Object.keys(c)[0] ?? "");
      }
    })();
  }, []);

  const search = async () => {
    if (!searchName.trim() || !searchClass) return;
    setLoading(true);
    const keys = await slist(`att_${searchClass}_`);
    const data = {};
    for (const k of keys) {
      const r = await sget(k);
      if (r) data[k.replace(`att_${searchClass}_`, "")] = r;
    }
    const all = courses[searchClass] || [];
    const match = all.find((s) =>
      s.toLowerCase().includes(searchName.toLowerCase().trim())
    );
    if (!match) {
      setResults({ error: "No se encontró ese alumno en esta clase." });
      setLoading(false);
      return;
    }
    const sorted = Object.keys(data).sort((a, b) => b.localeCompare(a));
    const records = sorted
      .map((date) => ({ date, status: data[date][match] ?? null }))
      .filter((r) => r.status !== null);
    const present = records.filter((r) => r.status === "P").length;
    const absent = records.filter((r) => r.status === "A").length;
    setResults({
      name: match,
      records,
      present,
      absent,
      total: records.length,
    });
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1117",
        color: "#f0f0f0",
        fontFamily: "'Nunito',sans-serif",
        paddingBottom: 40,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&family=Space+Mono:wght@700&display=swap"
        rel="stylesheet"
      />
      <div
        style={{
          background: "linear-gradient(135deg,#1a1f2e,#252b3b)",
          borderBottom: "2px solid #3498db",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: 11,
              color: "#3498db",
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Mi Asistencia
          </div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>👤 Vista Alumno</div>
        </div>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,.08)",
            border: "1px solid rgba(255,255,255,.15)",
            color: "#aaa",
            borderRadius: 8,
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ← Volver
        </button>
      </div>
      <div style={{ padding: 16 }}>
        <div
          style={{
            background: "#1a1f2e",
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                fontSize: 12,
                color: "#666",
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Tu clase
            </label>
            <select
              value={searchClass}
              onChange={(e) => setSearchClass(e.target.value)}
              style={{
                width: "100%",
                marginTop: 6,
                background: "#252b3b",
                border: "1px solid rgba(255,255,255,.1)",
                color: "#f0f0f0",
                borderRadius: 9,
                padding: "10px 12px",
                fontSize: 15,
              }}
            >
              {Object.keys(courses).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 12,
                color: "#666",
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Tu apellido o nombre
            </label>
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="ej: López"
              style={{
                width: "100%",
                marginTop: 6,
                background: "#252b3b",
                border: "1px solid rgba(255,255,255,.1)",
                color: "#f0f0f0",
                borderRadius: 9,
                padding: "10px 12px",
                fontSize: 15,
                boxSizing: "border-box",
              }}
            />
          </div>
          <Btn
            onClick={search}
            color="#3498db"
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Buscando..." : "Ver mi asistencia"}
          </Btn>
        </div>
        {results &&
          (results.error ? (
            <div
              style={{
                background: "rgba(231,76,60,.12)",
                border: "1px solid rgba(231,76,60,.3)",
                borderRadius: 12,
                padding: 16,
                color: "#e74c3c",
                textAlign: "center",
              }}
            >
              {results.error}
            </div>
          ) : (
            <div>
              <div
                style={{
                  background: "#1a1f2e",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{ fontWeight: 900, fontSize: 20, marginBottom: 12 }}
                >
                  {results.name}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                  }}
                >
                  {[
                    ["Total", results.total, "#aaa"],
                    ["Presentes", results.present, "#2ecc71"],
                    ["Ausentes", results.absent, "#e74c3c"],
                  ].map(([l, v, c]) => (
                    <div
                      key={l}
                      style={{
                        textAlign: "center",
                        background: "#252b3b",
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <div style={{ fontSize: 24, fontWeight: 900, color: c }}>
                        {v}
                      </div>
                      <div style={{ fontSize: 11, color: "#666" }}>{l}</div>
                    </div>
                  ))}
                </div>
                {results.total > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div
                      style={{ fontSize: 12, color: "#666", marginBottom: 6 }}
                    >
                      Porcentaje de asistencia
                    </div>
                    <div
                      style={{
                        background: "#252b3b",
                        borderRadius: 20,
                        height: 10,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.round(
                            (results.present / results.total) * 100
                          )}%`,
                          background: "linear-gradient(90deg,#2ecc71,#27ae60)",
                          borderRadius: 20,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        color: "#2ecc71",
                        fontWeight: 700,
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    >
                      {Math.round((results.present / results.total) * 100)}%
                    </div>
                  </div>
                )}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color: "#666",
                  fontSize: 13,
                  marginBottom: 8,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Detalle por clase
              </div>
              {results.records.map(({ date, status }) => (
                <div
                  key={date}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "#1a1f2e",
                    borderRadius: 10,
                    marginBottom: 7,
                    border: `1px solid ${
                      status === "P"
                        ? "rgba(46,204,113,.2)"
                        : "rgba(231,76,60,.2)"
                    }`,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{displayDate(date)}</span>
                  <span
                    style={{
                      fontWeight: 900,
                      color: status === "P" ? "#2ecc71" : "#e74c3c",
                    }}
                  >
                    {status === "P" ? "✓ Presente" : "✗ Ausente"}
                  </span>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

function Login({ onTeacher, onStudent }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const tryLogin = () => {
    if (pin === TEACHER_PIN) onTeacher();
    else {
      setError("PIN incorrecto");
      setPin("");
    }
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Nunito',sans-serif",
        padding: 24,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&family=Space+Mono:wght@700&display=swap"
        rel="stylesheet"
      />
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🏃</div>
          <div
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: 11,
              color: "#2ecc71",
              letterSpacing: 4,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Educación Física
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1 }}>
            Control de Asistencia
          </div>
        </div>
        <div
          style={{
            background: "#1a1f2e",
            borderRadius: 18,
            padding: 24,
            marginBottom: 16,
            border: "1px solid rgba(46,204,113,.2)",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#2ecc71",
              marginBottom: 14,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            🔒 Acceso Profesora
          </div>
          <input
            type="password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && tryLogin()}
            placeholder="PIN (prueba: 1234)"
            style={{
              width: "100%",
              background: "#252b3b",
              border: `1px solid ${error ? "#e74c3c" : "rgba(255,255,255,.1)"}`,
              color: "#f0f0f0",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 16,
              boxSizing: "border-box",
              marginBottom: 10,
            }}
          />
          {error && (
            <div style={{ color: "#e74c3c", fontSize: 13, marginBottom: 8 }}>
              {error}
            </div>
          )}
          <Btn onClick={tryLogin} color="#2ecc71" style={{ width: "100%" }}>
            Entrar como Profesora
          </Btn>
        </div>
        <div
          style={{
            background: "#1a1f2e",
            borderRadius: 18,
            padding: 24,
            border: "1px solid rgba(52,152,219,.2)",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#3498db",
              marginBottom: 14,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            👤 Soy Alumno/a
          </div>
          <Btn onClick={onStudent} color="#3498db" style={{ width: "100%" }}>
            Ver mi asistencia
          </Btn>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  if (role === "teacher") return <TeacherApp onLogout={() => setRole(null)} />;
  if (role === "student") return <StudentView onBack={() => setRole(null)} />;
  return (
    <Login
      onTeacher={() => setRole("teacher")}
      onStudent={() => setRole("student")}
    />
  );
}
