"use client";

import AttributeEditor from "@cloudscape-design/components/attribute-editor";
import Input from "@cloudscape-design/components/input";
import Textarea from "@cloudscape-design/components/textarea";

type Field<T> = { key: keyof T & string; label: string; multiline?: boolean };

/** A list of small records the school writes itself, such as programmes or testimonials. */
export function ListEditor<T extends Record<string, string>>({
  name,
  items,
  fields,
  blank,
  max,
  errors,
  texts,
  onChange,
}: {
  name: string;
  items: T[];
  fields: Field<T>[];
  blank: T;
  max: number;
  errors: Record<string, string>;
  texts: { add: string; remove: string; empty: string };
  onChange: (items: T[]) => void;
}) {
  const update = (index: number, key: keyof T & string, value: string) =>
    onChange(
      items.map((item, at) =>
        at === index ? { ...item, [key]: value } : item,
      ),
    );

  return (
    <AttributeEditor
      items={items}
      addButtonText={texts.add}
      removeButtonText={texts.remove}
      empty={texts.empty}
      disableAddButton={items.length >= max}
      onAddButtonClick={() => onChange([...items, blank])}
      onRemoveButtonClick={({ detail }) =>
        onChange(items.filter((_, at) => at !== detail.itemIndex))
      }
      definition={fields.map((field) => ({
        label: field.label,
        errorText: (_item: T, index: number) =>
          errors[`${name}.${index}.${field.key}`],
        control: (item: T, index: number) =>
          field.multiline ? (
            <Textarea
              rows={3}
              value={item[field.key] ?? ""}
              onChange={({ detail }) => update(index, field.key, detail.value)}
            />
          ) : (
            <Input
              value={item[field.key] ?? ""}
              onChange={({ detail }) => update(index, field.key, detail.value)}
            />
          ),
      }))}
    />
  );
}
