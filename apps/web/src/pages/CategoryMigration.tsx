import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

export default function CategoryMigration() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/reports/available-years`)
      .then(res => {
        const years = res.data.years || [];
        if (years.length > 0) {
          setAvailableYears(years);
        } else {
          const currentYear = new Date().getFullYear();
          setAvailableYears(Array.from({ length: 10 }, (_, i) => currentYear - i));
        }
      })
      .catch(() => {
        const currentYear = new Date().getFullYear();
        setAvailableYears(Array.from({ length: 10 }, (_, i) => currentYear - i));
      });
  }, []);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/reports/category-migration?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;

  const migrationGroups = Object.keys(data.migrationGroups || {});

  return (
    <div className="print:hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Category Migration - {year}</h2>
        <div className="flex items-center space-x-2">
          <select
            value={year}
            onChange={(e) => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.set('year', e.target.value);
              setSearchParams(newSearchParams);
            }}
            className="border rounded px-3 py-2"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={handlePrint} className="px-4 py-2 bg-gray-600 text-white rounded">{t('print')}</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">Total Migrations</h3>
          <p className="text-3xl font-bold text-blue-600">{data.summary.totalMigrations}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
          <h3 className="text-lg font-semibold mb-2 text-green-800">Unique Employees</h3>
          <p className="text-3xl font-bold text-green-600">{data.summary.uniqueEmployees}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg shadow border-2 border-purple-200">
          <h3 className="text-lg font-semibold mb-2 text-purple-800">Migration Types</h3>
          <p className="text-3xl font-bold text-purple-600">{migrationGroups.length}</p>
        </div>
      </div>

      {/* Migration Groups */}
      {migrationGroups.length > 0 ? (
        <div className="space-y-6">
          {migrationGroups.map((groupKey) => {
            const migrations = data.migrationGroups[groupKey];
            return (
              <div key={groupKey} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {groupKey} ({migrations.length} {migrations.length === 1 ? 'employee' : 'employees'})
                  </h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {migrations.map((migration: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{migration.employee.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{migration.fromCategory}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-green-600">{migration.toCategory}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{migration.monthName} {migration.year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-center">No category migrations found for {year}</p>
        </div>
      )}

      {/* All Migrations Table (Collapsible) */}
      {data.migrations && data.migrations.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
          <details className="group">
            <summary className="px-6 py-4 bg-gray-100 cursor-pointer hover:bg-gray-200 font-semibold">
              View All Migrations ({data.migrations.length})
            </summary>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.migrations.map((migration: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{migration.employee.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{migration.fromCategory}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-green-600">{migration.toCategory}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{migration.monthName} {migration.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

