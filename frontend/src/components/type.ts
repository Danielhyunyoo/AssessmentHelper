export type FieldType = "rating" | "textarea" | "text" | "file" | "signature";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
}

export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

export interface FormSchema {
  version: string;
  formTitle: string;
  sections: FormSection[];
}