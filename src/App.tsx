import './App.css';
import { bitable, ITableMeta } from '@lark-base-open/js-sdk';
import { Button, Form } from '@douyinfe/semi-ui';
import { useState, useEffect, useRef, useCallback } from 'react';

interface FormValues {
  table?: string;
}

interface FormApi {
  setValues: (values: Partial<FormValues>) => void;
}

export default function App() {
  const [tableMetaList, setTableMetaList] = useState<ITableMeta[]>([]);
  const formApiRef = useRef<FormApi | null>(null);

  const addRecord = useCallback(async (values: FormValues) => {
    const tableId = values.table;
    if (!tableId) return;

    const table = await bitable.base.getTableById(tableId);
    await table.addRecord({
      fields: {},
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      const [metaList, selection] = await Promise.all([
        bitable.base.getTableMetaList(),
        bitable.base.getSelection(),
      ]);

      setTableMetaList(metaList);
      if (selection?.tableId) {
        formApiRef.current?.setValues({ table: selection.tableId });
      }
    };

    init();
  }, []);

  return (
    <main className="main">
      <h4>
        Edit <code>src/App.tsx</code> and save to reload
      </h4>

      <Form<FormValues>
        labelPosition="top"
        onSubmit={addRecord}
        getFormApi={(api: FormApi) => (formApiRef.current = api)}
      >
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
        >
          {tableMetaList.map(({ id, name }) => (
            <Form.Select.Option key={id} value={id}>
              {name}
            </Form.Select.Option>
          ))}
        </Form.Select>

        <Button theme="solid" htmlType="submit">
          Add Record
        </Button>
      </Form>
    </main>
  );
}
