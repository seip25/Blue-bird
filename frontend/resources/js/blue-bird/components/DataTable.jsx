import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import Button from './Button.jsx';
import Input from './Input.jsx';

export default function DataTable({
    data = [],
    columns = [],
    rowsPerPage = 10,
    searchable = true,
    pagination = true,
    onEdit,
    onDelete
}) {
    const { t } = useLanguage();
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        const lowerTerm = searchTerm.toLowerCase();
        return data.filter(item =>
            columns.some(col => String(item[col.key] || '').toLowerCase().includes(lowerTerm))
        );
    }, [data, columns, searchTerm]);

    const pageCount = Math.ceil(filteredData.length / rowsPerPage);
    const paginatedData = useMemo(() => {
        if (!pagination) return filteredData;
        const start = (currentPage - 1) * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, currentPage, rowsPerPage, pagination]);

    return (
        <div className="flex flex-col w-full gap-4">
            {searchable && (
                <div className="flex justify-end">
                    <Input
                        placeholder={t('search')}
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full md:w-64"
                    />
                </div>
            )}

            <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                    <thead className="bg-gray-50 dark:bg-slate-800/50">
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    {col.title || col.key}
                                </th>
                            ))}
                            {(onEdit || onDelete) && (
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    {t('actions')}
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                        {paginatedData.length > 0 ? paginatedData.map((row, idx) => (
                            <tr key={row.id || idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                {columns.map(col => (
                                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">
                                        {row[col.key] || '-'}
                                    </td>
                                ))}
                                {(onEdit || onDelete) && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        {onEdit && (
                                            <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => onEdit(row)}>
                                                {t('edit')}
                                            </Button>
                                        )}
                                        {onDelete && (
                                            <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => onDelete(row)}>
                                                {t('delete')}
                                            </Button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-slate-400">
                                    No data available.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && pageCount > 1 && (
                <div className="flex justify-end mt-4 gap-1">
                    <Button
                        variant="secondary"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        &laquo;
                    </Button>
                    {Array.from({ length: pageCount }).map((_, i) => (
                        <Button
                            key={i}
                            variant={currentPage === i + 1 ? 'primary' : 'ghost'}
                            onClick={() => setCurrentPage(i + 1)}
                        >
                            {i + 1}
                        </Button>
                    ))}
                    <Button
                        variant="secondary"
                        disabled={currentPage === pageCount}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        &raquo;
                    </Button>
                </div>
            )}
        </div>
    );
}
