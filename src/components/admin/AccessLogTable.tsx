import React from 'react';
import { FirstAccessRecord } from '../../types';

interface AccessLogTableProps {
  records: FirstAccessRecord[];
  isLoading: boolean;
}

export const AccessLogTable: React.FC<AccessLogTableProps> = ({ records, isLoading }) => {
  return (
    <div className="bg-dark-light p-6 rounded-lg shadow-lg mt-8">
      <h2 className="text-xl font-bold text-white mb-4">Últimos Acessos Registrados</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-300 uppercase bg-dark-lighter">
            <tr>
              <th scope="col" className="px-6 py-3">Nome</th>
              <th scope="col" className="px-6 py-3">Data</th>
              <th scope="col" className="px-6 py-3">Origem (UTM)</th>
              <th scope="col" className="px-6 py-3">Campanha (UTM)</th>
              <th scope="col" className="px-6 py-3">Dispositivo</th>
              <th scope="col" className="px-6 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="bg-dark-light border-b border-dark-lighter">
                <td colSpan={6} className="px-6 py-4 text-center">Carregando...</td>
              </tr>
            ) : records.length === 0 ? (
              <tr className="bg-dark-light border-b border-dark-lighter">
                <td colSpan={6} className="px-6 py-4 text-center">Nenhum registro encontrado.</td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="bg-dark-light border-b border-dark-lighter hover:bg-dark-lighter/50">
                  <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{record.name}</td>
                  <td className="px-6 py-4">{new Date(record.created_at!).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4">{record.utm_source ?? 'N/A'}</td>
                  <td className="px-6 py-4">{record.utm_campaign ?? 'N/A'}</td>
                  <td className="px-6 py-4">{record.device_type}</td>
                  <td className="px-6 py-4">{record.ip_address}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};