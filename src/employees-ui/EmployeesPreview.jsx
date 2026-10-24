import React, { useState } from "react";
import { Eye, Trash2, Plus, Search, X, ArrowRight } from "lucide-react";
import EmployeePermissionsPreview from "./EmployeePermissionsPreview";
import "./employees-preview.css";
const initial = [
  ["محمد احمد", "mohamedahmed@gmail.com", true],
  ["علي سعيد", "alisaed@gmail.com", false],
  ["فاطمه يوسف", "fatmayoussef@gmail.com", true],
  ["ساره خليل", "sarakhalil@gmail.com", false],
  ["حسن محمد", "hassanmohamed@gmail.com", true],
  ["ليلى عبد الله", "lailaabdallah@gmail.com", false],
  ["طارق نبيل", "tarek@gmail.com", true],
].map(([name, email, active], i) => ({ id: i + 1, name, email, active }));
export default function EmployeesPreview() {
  const [employees, setEmployees] = useState(initial),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState([]),
    [detail, setDetail] = useState(null),
    [modal, setModal] = useState(null),
    [page, setPage] = useState(1),
    [form, setForm] = useState({
      name: "",
      email: "",
      password: "",
      active: true,
    });
  const filtered = employees.filter((e) =>
    `${e.name} ${e.email} ${e.active ? "نشط" : "غير نشط"}`.includes(
      search.trim(),
    ),
  );
  function add(e) {
    e.preventDefault();
    const employee = { name: form.name, email: form.email, active: form.active, id: Date.now() };
    setEmployees((previous) => [employee, ...previous]);
    setModal(null);
    setSearch("");
    setPage(1);
    setForm({ name: "", email: "", password: "", active: true });
  }
  if (detail)
    return (
      <div className="employees-ui-detail">
        <button className="eui-back" onClick={() => setDetail(null)}>
          <ArrowRight size={16} />
          العودة للموظفين
        </button>
        <EmployeePermissionsPreview key={detail.id} name={detail.name} />
      </div>
    );
  return (
    <section className="employees-ui" dir="rtl">
      <div className="eui-heading">
        <h1>إدارة الموظفين</h1>
        <button className="eui-add" onClick={() => setModal({ type: "add" })}>
          <Plus size={17} />
          إضافة جديد
        </button>
      </div>
      <div className="eui-paper">
        <label className="eui-search">
          <input
            aria-label="البحث عن موظف"
            placeholder="البحث باسم الموظف، الحالة ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Search size={17} />
        </label>
        <div className="eui-scroll">
          <table>
            <thead>
              <tr>
                <th className="eui-select">
                  <input
                    type="checkbox"
                    aria-label="تحديد جميع الموظفين"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((e) => selected.includes(e.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? filtered.map((e) => e.id) : [],
                      )
                    }
                  />
                </th>
                <th>اسم الموظف</th>
                <th>البريد الإلكتروني</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`تحديد ${employee.name}`}
                      checked={selected.includes(employee.id)}
                      onChange={(e) =>
                        setSelected((previous) =>
                          e.target.checked
                            ? [...previous, employee.id]
                            : previous.filter((id) => id !== employee.id),
                        )
                      }
                    />
                  </td>
                  <td>{employee.name}</td>
                  <td className="eui-email">{employee.email}</td>
                  <td>
                    <span
                      className={`eui-status ${employee.active ? "active" : "inactive"}`}
                    >
                      <i />
                      {employee.active ? "نشط" : "غير نشط"}
                    </span>
                  </td>
                  <td>
                    <div className="eui-actions">
                      <button
                        className="eui-view"
                        aria-label={`عرض ${employee.name}`}
                        onClick={() => setDetail(employee)}
                      >
                        <Eye />
                      </button>
                      <button
                        className="eui-delete"
                        aria-label={`حذف ${employee.name}`}
                        onClick={() => setModal({ type: "delete", employee })}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan="5" className="eui-empty">
                    لا يوجد موظفون مطابقون للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <nav className="eui-pagination" aria-label="صفحات الموظفين">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            السابق
          </button>
          {[1, 2, 3, "…", 10].map((n) =>
            n === "…" ? (
              <span key={n}>…</span>
            ) : (
              <button
                key={n}
                aria-current={page === n ? "page" : undefined}
                className={page === n ? "selected" : ""}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ),
          )}
          {![1, 2, 3, 10].includes(page) && (
            <button className="selected">{page}</button>
          )}
          <button disabled={page === 10} onClick={() => setPage(page + 1)}>
            التالي
          </button>
        </nav>
      </div>
      {modal && (
        <div className="eui-backdrop" onClick={() => setModal(null)}>
          <section
            className="eui-modal"
            role="dialog"
            aria-modal="true"
            aria-label={modal.type === "add" ? "إضافة موظف جديد" : "حذف الموظف"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="eui-close"
              aria-label="إغلاق"
              onClick={() => setModal(null)}
            >
              <X size={16} />
            </button>
            {modal.type === "add" ? (
              <form onSubmit={add}>
                <h2>إضافة موظف جديد</h2>
                <label>
                  اسم الموظف
                  <input
                    autoFocus
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  البريد الإلكتروني
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </label>
                <label>
                  كلمة المرور
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </label>
                <label>
                  الحالة
                  <select
                    value={String(form.active)}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.value === "true" })
                    }
                  >
                    <option value="true">نشط</option>
                    <option value="false">غير نشط</option>
                  </select>
                </label>
                <button className="eui-submit" type="submit">
                  إضافة
                </button>
              </form>
            ) : (
              <>
                <h2>حذف الموظف</h2>
                <p>هل تريد حذف {modal.employee.name} من قائمة المعاينة؟</p>
                <div className="eui-confirm">
                  <button onClick={() => setModal(null)}>إلغاء</button>
                  <button
                    className="eui-submit"
                    onClick={() => {
                      setEmployees((previous) =>
                        previous.filter((e) => e.id !== modal.employee.id),
                      );
                      setSelected((previous) =>
                        previous.filter((id) => id !== modal.employee.id),
                      );
                      setModal(null);
                    }}
                  >
                    حذف
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
