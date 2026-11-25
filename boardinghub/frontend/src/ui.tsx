import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Modal } from 'antd';
import { Building2, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';

export type ThemeControls = { dark: boolean; toggleTheme: () => void };

export function Brand({ to = '/', caption, onClick }: { to?: string; caption?: string; onClick?: () => void }) {
  return (
    <Link to={to} className="brand" onClick={onClick}>
      <span className="brand-mark"><Building2 size={21} strokeWidth={2.2} /></span>
      <span><strong>BoardingHub</strong>{caption && <small>{caption}</small>}</span>
    </Link>
  );
}

export function ThemeButton({ dark, toggleTheme }: ThemeControls) {
  const label = dark ? 'Bật giao diện sáng' : 'Bật giao diện tối';
  return <button type="button" className="ui-icon-button" aria-label={label} title={label} onClick={toggleTheme}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>;
}

export function Status({ children }: { children: string }) {
  const success = ['Đã phát hành', 'Đã thanh toán', 'Đã hoàn thành', 'Đã kiểm tra', 'Đã xác nhận', 'Đã phản hồi', 'Đang công bố', 'Đang hiệu lực', 'Đủ xác nhận', 'Đã ghi nhận', 'Hoạt động'];
  const warning = ['Chờ xác nhận', 'Chờ kiểm tra', 'Chờ phản hồi', 'Chờ kiểm duyệt', 'Chờ thanh toán', 'Chờ đủ quỹ', 'Thanh toán một phần', 'Đề nghị đổi lịch', 'Cần bổ sung', 'Cần điều chỉnh', 'Đang kiểm tra'];
  const tone = success.includes(children) ? 'green' : warning.includes(children) ? 'amber' : ['Quá hạn', 'Đã từ chối'].includes(children) ? 'rose' : 'violet';
  return <span className={`status-label tone-${tone}`}>{children}</span>;
}

export function Heading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

export function Blank({ title, description }: { title: string; description?: string }) {
  return <div className="ui-empty"><strong>{title}</strong>{description && <p>{description}</p>}</div>;
}

export type Field = {
  key: string; label: string; type?: 'text' | 'textarea' | 'number' | 'date' | 'datetime-local' | 'month' | 'tel' | 'select';
  required?: boolean; options?: readonly (string | { value: string; label: string })[]; multiline?: boolean;
  min?: number | string; max?: number | string; step?: string; maxLength?: number; placeholder?: string; hint?: string;
};

export function FormDialog({ title, fields, initial, submit = 'Lưu', close, save, intro }: {
  title: string; fields: Field[]; initial?: Record<string, string | number>; submit?: string; close: () => void;
  save: (values: Record<string, string>) => string | void; intro?: string;
}) {
  const [error, setError] = useState('');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries([...new FormData(event.currentTarget)].map(([key, value]) => [key, String(value).trim()]));
    const missing = fields.find(field => field.required !== false && !values[field.key]);
    const issue = missing ? `Vui lòng nhập ${missing.label.toLocaleLowerCase('vi-VN')}.` : save(values);
    if (issue) setError(issue);
    else close();
  }

  return (
    <Modal open title={title} footer={null} onCancel={close} centered className="workspace-modal">
      {intro && <p className="form-intro">{intro}</p>}
      <form className="workspace-form" onSubmit={onSubmit}>
        {fields.map(field => {
          const shared = {
            name: field.key, required: field.required !== false, defaultValue: initial?.[field.key], placeholder: field.placeholder,
          };
          return <label className={field.type === 'textarea' || field.multiline ? 'form-wide' : undefined} key={field.key}>
            <span>{field.label}{field.required === false && <small> · Tùy chọn</small>}</span>
            {field.type === 'select' ? <select {...shared}>
              <option value="">Chọn {field.label.toLocaleLowerCase('vi-VN')}</option>
              {field.options?.map(option => typeof option === 'string' ? <option key={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}
            </select> : field.type === 'textarea' ? <textarea {...shared} rows={3} maxLength={field.maxLength ?? 500} /> :
              <input {...shared} type={field.type ?? 'text'} min={field.min} max={field.max} step={field.step} maxLength={field.maxLength ?? 150} />}
            {field.hint && <small>{field.hint}</small>}
          </label>;
        })}
        {error && <p className="form-error form-wide" role="alert">{error}</p>}
        <div className="dialog-actions form-wide">
          <button type="button" className="ui-button" onClick={close}>Hủy</button>
          <button type="submit" className="ui-button primary">{submit}</button>
        </div>
      </form>
    </Modal>
  );
}

export function Details({ title, data, actions, close }: { title: string; data: [string, ReactNode][]; actions?: ReactNode; close: () => void }) {
  return (
    <Modal open title={title} onCancel={close} footer={null} centered className="workspace-modal">
      <dl className="details-list">
        {data.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {actions && <div className="record-actions">{actions}</div>}
    </Modal>
  );
}

export function Table({ columns, rows, empty = 'Chưa có dữ liệu.' }: { columns: string[]; rows: { id: string; cells: ReactNode[] }[]; empty?: string }) {
  return rows.length ? (
    <div className="ui-table-scroll" tabIndex={0} aria-label="Bảng dữ liệu">
      <table className="ui-table">
        <thead><tr>{columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>{row.cells.map((cell, index) => <td key={columns[index]}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  ) : <Blank title={empty} />;
}
