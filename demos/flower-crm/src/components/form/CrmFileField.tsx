import { type InputHTMLAttributes, type ReactNode, useId, useRef, useState } from 'react'
import { CrmButton } from '../ui/CrmButton'
import { withCrmFieldInvalid } from '../../utils/crmInput'
import { compressPhotoForUpload } from '../../utils/compressPhotoForUpload'
import './crm-file-field.css'

export type CrmFileFieldProps = {
  label: string
  invalid?: boolean
  wrapperClass?: string
  labClass?: string
  buttonLabel?: string
  emptyLabel?: string
  hint?: ReactNode
  /** Сжать изображение до иконки перед передачей в onFileSelected. */
  compressPhoto?: boolean
  onFileSelected?: (file: File | null) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'
const DEMO_PHOTO_HINT = 'В демо загрузка фото недоступна.'

/** Загрузка файла (фото и т.п.) — кастомная кнопка вместо нативного «Выберите файл». */
export function CrmFileField({
  label,
  invalid = false,
  wrapperClass = 'crm-field',
  labClass = 'crm-field__lab',
  buttonLabel = 'Выбрать файл',
  emptyLabel = 'Файл не выбран',
  hint,
  disabled,
  onChange,
  compressPhoto = false,
  onFileSelected,
  id: idProp,
  ...inputProps
}: CrmFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autoId = useId()
  const inputId = idProp ?? autoId.replace(/:/g, '')
  const labelId = `${inputId}-lab`
  const [fileName, setFileName] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const demoLocked = isDemo

  const mergedHint =
    demoLocked && hint == null
      ? DEMO_PHOTO_HINT
      : demoLocked
        ? (
            <>
              {DEMO_PHOTO_HINT}
              {hint != null ? (typeof hint === 'string' ? ` ${hint}` : <> {hint}</>) : null}
            </>
          )
        : hint

  const handleFile = (raw: File | null) => {
    if (demoLocked) return
    if (!raw) {
      setFileName(null)
      onFileSelected?.(null)
      return
    }
    if (!compressPhoto) {
      setFileName(raw.name)
      onFileSelected?.(raw)
      return
    }
    setCompressing(true)
    void compressPhotoForUpload(raw)
      .then((compressed) => {
        setFileName(compressed.name)
        onFileSelected?.(compressed)
      })
      .catch(() => {
        setFileName(raw.name)
        onFileSelected?.(raw)
      })
      .finally(() => setCompressing(false))
  }

  return (
    <div className={withCrmFieldInvalid(invalid, wrapperClass)}>
      <span className={labClass} id={labelId}>
        {label}
      </span>
      <div className="crm-file-field">
        <input
          {...inputProps}
          ref={inputRef}
          id={inputId}
          type="file"
          className="crm-file-field__input"
          aria-labelledby={labelId}
          aria-invalid={invalid || undefined}
          disabled={disabled || compressing || demoLocked}
          onChange={(ev) => {
            handleFile(ev.target.files?.[0] ?? null)
            onChange?.(ev)
          }}
        />
        <CrmButton
          type="button"
          variant="ghost"
          disabled={disabled || compressing || demoLocked}
          onClick={() => inputRef.current?.click()}
        >
          {compressing ? 'Сжимаем…' : demoLocked ? 'Недоступно в демо' : buttonLabel}
        </CrmButton>
        {fileName ? (
          <span className="crm-file-field__name" title={fileName}>
            {fileName}
          </span>
        ) : (
          <span className="crm-file-field__empty">{emptyLabel}</span>
        )}
      </div>
      {mergedHint != null ? (
        typeof mergedHint === 'string' ? (
          <span className="crm-field__hint">{mergedHint}</span>
        ) : (
          mergedHint
        )
      ) : null}
    </div>
  )
}
