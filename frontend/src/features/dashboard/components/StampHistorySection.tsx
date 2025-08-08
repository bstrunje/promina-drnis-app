import React from "react";
import { StampHistoryItem } from "./types";
import { formatDate } from "../../../utils/dateUtils";
import { useTranslation } from "react-i18next";

interface StampHistorySectionProps {
  isLoading: boolean;
  stampHistory: StampHistoryItem[];
}

/**
 * Komponenta za prikaz povijesti markica
 */
export const StampHistorySection: React.FC<StampHistorySectionProps> = ({
  isLoading,
  stampHistory
}) => {
  const { t } = useTranslation('dashboards');

  if (isLoading) {
    return (
      <div className="w-full mt-6 bg-white shadow rounded-lg overflow-hidden sm:col-span-2">
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
            {t('stampHistory.title')}
          </h2>
        </div>
        <div className="p-4">
          <div className="flex justify-center items-center h-24">
            <p>{t('stampHistory.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (stampHistory.length === 0) {
    return (
      <div className="w-full mt-6 bg-white shadow rounded-lg overflow-hidden sm:col-span-2">
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
          {t('stampHistory.title')}
          </h2>
        </div>
        <div className="p-4">
          <div className="text-center p-4 text-gray-500">
          {t('stampHistory.empty')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-6 bg-white shadow rounded-lg overflow-hidden sm:col-span-2">
      <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">
        {t('stampHistory.title')}
        </h2>
      </div>
      <div className="p-4">
        {/* Mobile card view */}
        <div className="sm:hidden space-y-4">
          {stampHistory.map((record) => {
            // Odredi boju prema tipu
            let bg = "bg-blue-100", text = "text-blue-800";
            if (record.stamp_type === "student") {
              bg = "bg-green-100";
              text = "text-green-800";
            } else if (record.stamp_type === "pensioner") {
              bg = "bg-red-100";
              text = "text-red-800";
            }
            return (
              <div
                key={record.id}
                className={`border rounded-lg p-4 shadow-sm ${bg}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-semibold ${text}`}>{record.year}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Initial:</span>
                  <span className="font-medium">{record.initial_count}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Issued:</span>
                  <span className="font-medium">{record.issued_count}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Date:</span>
                  <span>{formatDate(record.reset_date)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">By:</span>
                  <span>{record.reset_by_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Notes:</span>
                  <span className="italic">{record.notes ?? "-"}</span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Table view for sm and up */}
        <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  {/* Ukloni Type stupac */}
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('stampHistory.initial')}
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('stampHistory.issued')}
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('stampHistory.date')}
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('stampHistory.by')}
                  </th>
                  <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('stampHistory.notes')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stampHistory.map((record) => {
                  // Odredi boju prema tipu
                  let bg = "hover:bg-blue-50", text = "text-blue-800";
                  if (record.stamp_type === "student") {
                    bg = "bg-green-100";
                    text = "text-green-800";
                  } else if (record.stamp_type === "pensioner") {
                    bg = "bg-red-100";
                    text = "text-red-800";
                  }
                  return (
                    <tr key={record.id} className={bg}>
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold ${text}`}>
                        {record.year}
                      </td>
                      {/* Ukloni Type stupac */}
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm ${text}`}>
                        {record.initial_count}
                      </td>
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm ${text}`}>
                        {record.issued_count}
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.reset_date)}
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.reset_by_name}
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-4 text-sm text-gray-500">
                        {record.notes ?? t('stampHistory.noNotes')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
