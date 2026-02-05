import './App.css';
import { bitable, IFieldMeta, ITableMeta, IRecord, FieldType, IOpenSingleSelect } from '@lark-base-open/js-sdk';
import { Button, Form, Banner } from '@douyinfe/semi-ui';
import { useState, useEffect, useRef, useCallback } from 'react';

interface FormValues {
  table?: string;
  columnx?: string;
  columny?: string;
  addedColumn?: string;
  deletedColumn?: string;
}

interface FormApi {
  setValues: (values: Partial<FormValues>) => void;
}

export default function App() {
  const [tableMetaList, setTableMetaList] = useState<ITableMeta[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | undefined>();
  const [fieldMetaList, setFieldMetaList] = useState<IFieldMeta[]>([]);
  const formApiRef = useRef<FormApi | null>(null);

  const compareColumns = useCallback(async (values: FormValues) => {
    const { table, columnx, columny, addedColumn, deletedColumn } = values;

    if (!table || !columnx || !columny || !addedColumn || !deletedColumn) {
      alert('Please select all required columns');
      return;
    }

    try {
      const tbl = await bitable.base.getTableById(table);

      // Get field meta to handle options
      const fieldMetaList = await tbl.getFieldMetaList();
      const getFieldMeta = (id: string) => fieldMetaList.find(f => f.id === id);

      const xMeta = getFieldMeta(columnx);
      const yMeta = getFieldMeta(columny);
      const addedMeta = getFieldMeta(addedColumn);
      const deletedMeta = getFieldMeta(deletedColumn);

      // Helper to map option IDs to Names if necessary
      const getOptionName = (fieldMeta: IFieldMeta | undefined, val: string): string => {
        const property = fieldMeta?.property as any;
        if (!property || !property.options) return val;
        const option = property.options.find((opt: any) => opt.id === val);
        return option ? option.name : val;
      };

      // Helper to resolve value to string(s)
      const resolveValue = (fieldMeta: IFieldMeta | undefined, val: any): string[] => {
        if (!val) return [];

        // Handle array (MultiSelect, etc.)
        if (Array.isArray(val)) {
          return val.map(v => {
            if (typeof v === 'object') return v.text || v.name || JSON.stringify(v);
            // If it's a primitive ID, try to resolve it
            return getOptionName(fieldMeta, String(v));
          });
        }

        // Handle single object
        if (typeof val === 'object') {
          return [val.text || val.name || JSON.stringify(val)];
        }

        // Handle primitive
        return [getOptionName(fieldMeta, String(val))];
      };

      // Fetch all records
      let hasMore = true;
      let pageToken: string | undefined = undefined;
      const records: IRecord[] = [];

      while (hasMore) {
        const response: any = await tbl.getRecords({ pageSize: 100, pageToken });
        records.push(...response.records);
        hasMore = response.hasMore;
        pageToken = response.pageToken;
      }

      const updates: { recordId: string; fields: Record<string, any> }[] = [];

      records.forEach(record => {
        // Convert field values to arrays (handles multiple items)
        const xVal = record.fields[columnx];
        const yVal = record.fields[columny];

        const xStrings = resolveValue(xMeta, xVal);
        const yStrings = resolveValue(yMeta, yVal);

        // Compare
        const added = yStrings.filter(v => !xStrings.includes(v));
        const deleted = xStrings.filter(v => !yStrings.includes(v));

        console.log(`Record ${record.recordId}: Added: [${added.join(', ')}], Deleted: [${deleted.join(', ')}]`);

        // Prepare write value based on destination type
        const formatWriteValue = (fieldMeta: IFieldMeta | undefined, values: string[]) => {
          if (!values.length) return '';

          if (fieldMeta?.type === FieldType.MultiSelect) {
            // Map values to existing option IDs
            const property = fieldMeta.property as any;
            return values.map(val => {
              const existingOption = property?.options?.find((opt: any) => opt.name === val);
              if (existingOption) return { id: existingOption.id };
              // If no existing option, cannot reliably create new → return nothing or skip
              return null;
            }).filter(v => v !== null);
          }

          // For Text column, just join as string
          return values.join(', ');
        };


        updates.push({
          recordId: record.recordId,
          fields: {
            [addedColumn]: formatWriteValue(addedMeta, added),
            [deletedColumn]: formatWriteValue(deletedMeta, deleted)
          }
        });
      });

      // Batch update
      const batchSize = 50;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        await tbl.setRecords(batch);
      }

      alert('Columns compared and updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to compare columns: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const [metaList, selection] = await Promise.all([
        bitable.base.getTableMetaList(),
        bitable.base.getSelection(),
      ]);
      setTableMetaList(metaList);
      if (selection?.tableId) {
        setSelectedTableId(selection.tableId);
        formApiRef.current?.setValues({ table: selection.tableId });
      }
    };
    init();
  }, []);

  const handleSelectTable = useCallback((value: any) => {
    setSelectedTableId(typeof value === 'string' ? value : undefined);
  }, []);

  useEffect(() => {
    const loadFields = async () => {
      if (!selectedTableId) return setFieldMetaList([]);
      const tbl = await bitable.base.getTableById(selectedTableId);
      const fields = await tbl.getFieldMetaList();
      setFieldMetaList(fields);
    };
    loadFields();
  }, [selectedTableId]);

  // Filter for text and multi-select fields
  const destFields = fieldMetaList.filter(f => f.type === FieldType.Text || f.type === FieldType.MultiSelect);

  return (
    <main className="main">
      <h4>
        Compare Columns
      </h4>
      <Banner
        type="info"
        description="Select two columns to compare. Differences will be written to the 'Added' and 'Deleted' columns (Text or MultiSelect)."
        style={{ marginBottom: 16 }}
      />

      <Form<FormValues>
        labelPosition="top"
        onSubmit={compareColumns}
        getFormApi={(api: FormApi) => (formApiRef.current = api)}
      >
        {/* Documentation Links */}
        <Form.Slot label="Development guide">
          <div>
            <a
              href="https://lark-technologies.larksuite.com/docx/HvCbdSzXNowzMmxWgXsuB2Ngs7d"
              target="_blank"
              rel="noopener noreferrer"
            >
              Base Extensions Guide
            </a>
            、
            <a
              href="https://bytedance.feishu.cn/docx/HazFdSHH9ofRGKx8424cwzLlnZc"
              target="_blank"
              rel="noopener noreferrer"
            >
              多维表格插件开发指南
            </a>
          </div>
        </Form.Slot>

        <Form.Slot label="API">
          <div>
            <a
              href="https://lark-technologies.larksuite.com/docx/Y6IcdywRXoTYSOxKwWvuLK09sFe"
              target="_blank"
              rel="noopener noreferrer"
            >
              Base Extensions Front-end API
            </a>
            、
            <a
              href="https://bytedance.feishu.cn/docx/HjCEd1sPzoVnxIxF3LrcKnepnUf"
              target="_blank"
              rel="noopener noreferrer"
            >
              多维表格插件API
            </a>
          </div>
        </Form.Slot>

        <Form.Select
          field="table"
          label="Select Table"
          placeholder="Please select a Table"
          style={{ width: '100%' }}
          onChange={handleSelectTable}
        >
          {tableMetaList.map(({ id, name }) => (
            <Form.Select.Option key={id} value={id}>
              {name}
            </Form.Select.Option>
          ))}
        </Form.Select>

        {/* Columns side by side */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <Form.Select
            field="columnx"
            label="Select Column X (Baseline)"
            placeholder="Please select a Column as Baseline"
            style={{ flex: 1 }}
            disabled={fieldMetaList.length === 0}
          >
            {fieldMetaList.map((field) => (
              <Form.Select.Option key={field.id} value={field.id}>
                {field.name}
              </Form.Select.Option>
            ))}
          </Form.Select>

          <Form.Select
            field="columny"
            label="Select Column Y (Comparison)"
            placeholder="Please select a Column as Comparison"
            style={{ flex: 1 }}
            disabled={fieldMetaList.length === 0}
          >
            {fieldMetaList.map((field) => (
              <Form.Select.Option key={field.id} value={field.id}>
                {field.name}
              </Form.Select.Option>
            ))}
          </Form.Select>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <Form.Select
            field="addedColumn"
            label="Select 'Added' Column (Text or MultiSelect)"
            placeholder="Please select the 'Added' column"
            style={{ flex: 1 }}
            disabled={destFields.length === 0}
          >
            {destFields.map((field) => (
              <Form.Select.Option key={field.id} value={field.id}>
                {field.name}
              </Form.Select.Option>
            ))}
          </Form.Select>

          <Form.Select
            field="deletedColumn"
            label="Select 'Deleted' Column (Text or MultiSelect)"
            placeholder="Please select the 'Deleted' column"
            style={{ flex: 1 }}
            disabled={destFields.length === 0}
          >
            {destFields.map((field) => (
              <Form.Select.Option key={field.id} value={field.id}>
                {field.name}
              </Form.Select.Option>
            ))}
          </Form.Select>
        </div>

        <Button theme="solid" htmlType="submit" style={{ marginTop: 16 }}>
          Compare columns
        </Button>
      </Form>
    </main>
  );
}
