// src/components/DataTable.tsx
import React from "react";

// Column Definition Interface
export interface Column<T> {
  header: string;
  accessor?: keyof T; // Key from SQL data object (e.g. "observerName")
  render?: (row: T, index: number) => React.ReactNode; // Custom cell renderer (inputs/buttons)
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  instructionText?: string;
  themeColor?: "green" | "orange" | "blue" | "pink"; // Wireframe border themes
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  instructionText,
  themeColor = "green",
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  return (
    <div className={`table-container theme-${themeColor}`}>
      {instructionText && (
        <div className="table-instruction">{instructionText}</div>
      )}
      <div className="table-scroll-wrapper">
        <table className="custom-data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-row">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col, colIndex) => (
                    <td key={colIndex}>
                      {col.render
                        ? col.render(row, rowIndex)
                        : col.accessor
                        ? row[col.accessor]
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}