import { useState } from 'react';
import { Modal } from 'antd';
import type { Field } from '../ui';
import { authError } from '../auth';
export type RentalDialog = {title:string;path:string;fields:Field[];initial?:Record<string,string|number>;intro?:string};
export function RentalForm({dialog,close,save,busy}:{dialog:RentalDialog;close:()=>void;save:(path:string,data:Record<string,string>)=>Promise<unknown>;busy:boolean}) {
  const [error,setError]=useState('');
  return <Modal open title={dialog.title} footer={null} onCancel={()=>{if(!busy)close();}} maskClosable={!busy} className="workspace-modal">
    {dialog.intro&&<p className="form-intro">{dialog.intro}</p>}
    <form className="workspace-form" onSubmit={async event=>{
      event.preventDefault(); setError('');
      const values=Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string,string>;
      try { await save(dialog.path,values); close(); } catch(error) { setError(authError(error)); }
    }}>
      {dialog.fields.map(field=>{
        const shared={name:field.key,required:field.required!==false,defaultValue:dialog.initial?.[field.key],disabled:busy};
        return <label key={field.key} className={field.multiline||field.type==='textarea'?'form-wide':undefined}><span>{field.label}</span>
          {field.type==='select'?<select {...shared}><option value="">Chọn {field.label.toLowerCase()}</option>{field.options?.map(option=>typeof option==='string'?<option key={option}>{option}</option>:<option key={option.value} value={option.value}>{option.label}</option>)}</select>
            :field.type==='textarea'?<textarea {...shared} maxLength={field.maxLength||1000} rows={3}/>
            :<input {...shared} type={field.type||'text'} min={field.min} max={field.max} step={field.step|| (field.type==='number'?'0.01':undefined)} maxLength={field.maxLength||150}/>}
          {field.hint&&<small>{field.hint}</small>}
        </label>;
      })}
      {error&&<p className="form-error form-wide" role="alert">{error}</p>}
      <div className="dialog-actions form-wide"><button type="button" className="ui-button" disabled={busy} onClick={close}>Hủy</button><button className="ui-button primary" disabled={busy} type="submit">{busy?'Đang lưu…':'Xác nhận'}</button></div>
    </form>
  </Modal>;
}
