'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { ArrowLeft, Search, Filter, SortAsc, SortDesc, ChevronDown, Download, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import AdminGuard from '@/features/admin/components/AdminGuard';

const KNOWN_COLLECTIONS = [
    'users',
    'buses',
    'trips',
    'routes',
    'attendance'
];

const OPERATORS = [
    { value: '==', label: 'Equals (==)' },
    { value: '!=', label: 'Not Equals (!=)' },
    { value: '>', label: 'Greater Than (>)' },
    { value: '<', label: 'Less Than (<)' },
    { value: '>=', label: 'Greater/Equal (>=)' },
    { value: '<=', label: 'Less/Equal (<=)' },
    { value: 'in', label: 'In Array (in)' },
    { value: 'not-in', label: 'Not In Array (not-in)' },
    { value: 'array-contains', label: 'Array Contains' },
    { value: 'array-contains-any', label: 'Array Contains Any' },
];

/**
 * Custom Dropdown Component for consistent Dark styling
 */
function CustomSelect({ label, value, options, onChange, placeholder = "Select...", disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className="space-y-1.5 relative group" ref={dropdownRef}>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
            <div
                className={`w-full px-4 py-2.5 rounded-xl border bg-card/50 backdrop-blur-sm text-foreground cursor-pointer flex items-center justify-between transition-all hover:bg-card/80 hover:border-cc-purple-500/50 ${isOpen ? 'ring-2 ring-cc-purple-500/50 border-cc-purple-500/50 bg-card/80' : 'border-border'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`block truncate ${!selectedOption && 'text-muted-foreground'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180 text-cc-purple-400' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl max-h-60 overflow-auto animate-dropdown-enter custom-scrollbar ring-1 ring-black/20">
                    <ul className="py-1">
                        {options.map((option) => (
                            <li
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${option.value === value ? 'bg-cc-purple-500/20 text-cc-purple-300 font-semibold' : 'text-slate-200 hover:bg-white/5 hover:text-white'}`}
                            >
                                {option.label}
                            </li>
                        ))}
                        {options.length === 0 && (
                            <li className="px-4 py-2.5 text-sm text-muted-foreground italic text-center">No options</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

/**
 * Formats a single Firestore value into a human-readable React node.
 */
function formatCellValue(value) {
    if (value === null || value === undefined) {
        return <span className="text-muted-foreground/50 italic text-xs">—</span>;
    }

    // Firestore Timestamp
    if (value && typeof value === 'object' && typeof value.toDate === 'function') {
        const d = value.toDate();
        return (
            <span className="flex items-center gap-1 text-xs text-sky-400 whitespace-nowrap">
                <Clock size={12} />
                {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        );
    }

    if (typeof value === 'boolean') {
        return value
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400"><CheckCircle2 size={11} />true</span>
            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400"><XCircle size={11} />false</span>;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return <span className="text-muted-foreground/50 italic text-xs">[ ]</span>;
        return (
            <div className="flex flex-wrap gap-1 max-w-xs">
                {value.map((item, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-cc-purple-500/15 text-cc-purple-300 rounded text-xs font-mono">
                        {String(item)}
                    </span>
                ))}
            </div>
        );
    }

    if (typeof value === 'object') {
        return (
            <details className="cursor-pointer">
                <summary className="text-xs text-amber-400 hover:text-amber-300 select-none">{Object.keys(value).length} fields</summary>
                <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-muted-foreground bg-muted/30 rounded p-2 max-w-sm">
                    {JSON.stringify(value, null, 2)}
                </pre>
            </details>
        );
    }

    const str = String(value);
    return (
        <span className="block max-w-xs truncate" title={str.length > 60 ? str : undefined}>
            {str}
        </span>
    );
}

/**
 * Derives a plain-text string for CSV export from a cell value.
 */
function csvCell(value) {
    if (value === null || value === undefined) return '';
    if (value && typeof value === 'object' && typeof value.toDate === 'function') {
        return value.toDate().toLocaleString();
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

/**
 * Renders query results as a dynamic, human-readable table.
 */
function ResultsTable({ results, loading, error }) {
    // Collect all field keys across all documents (excluding id – shown separately)
    const columns = results.length > 0
        ? Array.from(new Set(results.flatMap(doc => Object.keys(doc).filter(k => k !== 'id')))).sort()
        : [];

    const handleExportCSV = () => {
        const header = ['id', ...columns];
        const rows = results.map(doc =>
            header.map(col => {
                const raw = csvCell(doc[col]);
                // Escape quotes for CSV
                return `"${raw.replace(/"/g, '""')}"`;
            }).join(',')
        );
        const csv = [header.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query_results_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Filter size={20} className="text-cc-purple-500" />
                    Query Results
                    <span className="text-sm font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ml-2">
                        {results.length} found
                    </span>
                </h2>
                {results.length > 0 && (
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-card hover:bg-muted/40 text-foreground transition-all"
                    >
                        <Download size={15} /> Export CSV
                    </button>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 font-medium">
                    {error}
                </div>
            )}

            {results.length > 0 ? (
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 font-bold whitespace-nowrap sticky left-0 bg-secondary/50 z-10">Doc ID</th>
                                    {columns.map(col => (
                                        <th key={col} className="px-4 py-3 font-bold whitespace-nowrap">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((doc, i) => (
                                    <tr
                                        key={doc.id}
                                        className={`border-b border-border hover:bg-muted/30 transition-colors ${
                                            i % 2 === 0 ? 'bg-background' : 'bg-card/40'
                                        }`}
                                    >
                                        <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground/60 align-top whitespace-nowrap sticky left-0 bg-inherit z-10 border-r border-border/50">
                                            {doc.id}
                                        </td>
                                        {columns.map(col => (
                                            <td key={col} className="px-4 py-3 align-top">
                                                {formatCellValue(doc[col])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                !loading && (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl opacity-50">
                        <Search size={40} className="mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">Execute a query to see results here</p>
                    </div>
                )
            )}
        </div>
    );
}

export default function DataQueryPage() {
    const [collectionName, setCollectionName] = useState('users');
    const [fieldName, setFieldName] = useState('');
    const [operator, setOperator] = useState('==');
    const [value, setValue] = useState('');

    // sorting - sortField removed as per request
    // const [sortField, setSortField] = useState('');
    const [sortOrder, setSortOrder] = useState('asc');

    const [availableFields, setAvailableFields] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch available fields when collection changes
    useEffect(() => {
        const fetchSchema = async () => {
            try {
                const q = query(collection(db, collectionName), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const docData = snap.docs[0].data();
                    const keys = Object.keys(docData).sort();
                    setAvailableFields(keys);
                    // Reset field selections if they don't exist in new collection (optional, but good UX)
                    if (!keys.includes(fieldName)) setFieldName('');
                    // if (!keys.includes(sortField)) setSortField('');
                } else {
                    setAvailableFields([]);
                }
            } catch (e) {
                console.error("Error fetching schema:", e);
                // Fallback or silent fail
                setAvailableFields([]);
            }
        };

        fetchSchema();
    }, [collectionName]);

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const constraints = [];
            const colRef = collection(db, collectionName);

            // 1. Filter Constraint
            if (fieldName && value) {
                let parsedValue = value;

                // Value parsing logic
                if (value === 'true') parsedValue = true;
                else if (value === 'false') parsedValue = false;
                else if (value === 'null') parsedValue = null;
                else if (!isNaN(Number(value)) && value.trim() !== '') parsedValue = Number(value);

                // Handle array inputs for 'in', 'not-in', 'array-contains-any'
                if (['in', 'not-in', 'array-contains-any'].includes(operator)) {
                    // Expect comma separated values
                    parsedValue = value.split(',').map(v => v.trim());
                    // Try to parse numbers/bools inside the array
                    parsedValue = parsedValue.map(v => {
                        if (v === 'true') return true;
                        if (v === 'false') return false;
                        if (!isNaN(Number(v)) && v !== '') return Number(v);
                        return v;
                    });
                }

                constraints.push(where(fieldName, operator, parsedValue));
            }

            // 2. Sorting Constraint

            if (fieldName) { // Implicit sort by filtered field if no explicit sort field
                // Firestore requires sorting by the field used in inequality, but for equality it's flexible.
                // We will skip explicit orderBy unless we want to enforce sort by fieldName.
                // If we sort by fieldName with '==' operator, it does nothing.
                // For now, let's remove explicit orderBy since user requested removal of "Sort By" field.
                // constraints.push(orderBy(fieldName, sortOrder)); 

                // Actually, if we use range operators, we MUST sort by fieldName first.
                if (['<', '<=', '>', '>='].includes(operator)) {
                    constraints.push(orderBy(fieldName, sortOrder));
                }
            }

            const q = query(colRef, ...constraints);

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setResults(data);
        } catch (err) {
            console.error(err);
            setError("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Prepare options for custom select
    const collectionOptions = KNOWN_COLLECTIONS.map(col => ({ value: col, label: col.charAt(0).toUpperCase() + col.slice(1) }));
    const fieldOptions = availableFields.map(f => ({ value: f, label: f }));
    // Add "No Sorting" option to sort fields
    const sortFieldOptions = [{ value: '', label: 'No Sorting' }, ...fieldOptions];

    return (
        <AdminGuard>
            <div className="font-sans text-foreground min-h-screen bg-background p-6">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/dashboard/admin" className="p-2 hover:bg-muted rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-bold text-foreground">Data Query Interface</h1>
                </div>

                {/* Query Form */}
                <div className="bg-card p-6 rounded-2xl border border-border mb-8 shadow-sm">
                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">

                        {/* Row 1: Collection & Fields */}
                        <CustomSelect
                            label="Collection"
                            value={collectionName}
                            options={collectionOptions}
                            onChange={setCollectionName}
                        />

                        <CustomSelect
                            label="Filter Field"
                            value={fieldName}
                            options={[{ value: '', label: 'Select Field...' }, ...fieldOptions]}
                            onChange={setFieldName}
                            placeholder="Select Field..."
                        />

                        <CustomSelect
                            label="Operator"
                            value={operator}
                            options={OPERATORS}
                            onChange={setOperator}
                        />

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Value (Optional)</label>
                            <input
                                type="text"
                                placeholder={['in', 'not-in', 'array-contains-any'].includes(operator) ? "e.g. active, idle" : "Value to match..."}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-cc-purple-500/50 focus:outline-none transition-all placeholder:text-muted-foreground/50 h-[46px]"
                            />
                        </div>

                        {/* Row 2: Sorting & Action */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order</label>
                            <div className="flex bg-muted/20 rounded-xl p-1 border border-border h-[46px]">
                                <button
                                    type="button"
                                    onClick={() => setSortOrder('asc')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium transition-all ${sortOrder === 'asc' ? 'bg-card shadow-sm text-foreground border border-border/50' : 'text-muted-foreground hover:bg-card/50'}`}
                                >
                                    <SortAsc size={16} /> Asc
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSortOrder('desc')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium transition-all ${sortOrder === 'desc' ? 'bg-card shadow-sm text-foreground border border-border/50' : 'text-muted-foreground hover:bg-card/50'}`}
                                >
                                    <SortDesc size={16} /> Desc
                                </button>
                            </div>
                        </div>

                        <div className="lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="w-full lg:w-auto px-8 py-2.5 bg-cc-purple-600 hover:bg-cc-purple-700 text-white rounded-xl font-bold shadow-md shadow-cc-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 h-[46px]"
                            >
                                {loading ? <span className="animate-spin">⌛</span> : <Search size={18} />}
                                Run Query
                            </button>
                        </div>

                    </form>
                </div>

                {/* Results */}
                <ResultsTable results={results} loading={loading} error={error} />
            </div>
        </AdminGuard>
    );
}
