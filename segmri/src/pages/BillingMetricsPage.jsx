import React, { useState, useEffect } from "react";
import api from "../api/AxiosInstance";

const BillingMetricsPage = () => {
  const [totalCosts, setTotalCosts] = useState([]);
  const [serviceCosts, setServiceCosts] = useState([]);

  // Fetch data from both endpoints
  const fetchBillingMetrics = async () => {
    try {
      const [totalRes, serviceRes] = await Promise.all([
        api.get("/metrics/billing/total"),
        api.get("/metrics/billing/by-service"),
      ]);

      if (totalRes.data.success) {
        setTotalCosts(totalRes.data.data || []);
      }
      if (serviceRes.data.success) {
        setServiceCosts(serviceRes.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching billing metrics:", error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBillingMetrics();
  }, []);

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          AWS Billing Metrics
        </h1>
      </div>

      {/* Total Costs Table */}
      <div className="bg-white shadow-md rounded-2xl p-4">
        <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
          Total Costs
        </h2>
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-2 px-4 text-left">Cost</th>
              <th className="py-2 px-4 text-right">Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            {totalCosts.length > 0 ? (
              totalCosts.map((cost, index) => (
                <tr
                  key={index}
                  className="border-t border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-2 px-4">{cost.service}</td>
                  <td className="py-2 px-4 text-right font-medium text-green-600">
                    {cost.amount.toFixed(2)} {cost.unit}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="text-center py-3 text-gray-500">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cost by Service Table */}
      <div className="bg-white shadow-md rounded-2xl p-4">
        <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
          Billing by Service
        </h2>
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-2 px-4 text-left">Service</th>
              <th className="py-2 px-4 text-right">Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            {serviceCosts.length > 0 ? (
              serviceCosts.map((cost, index) => (
                <tr
                  key={index}
                  className="border-t border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-2 px-4">{cost.service}</td>
                  <td className="py-2 px-4 text-right font-medium text-blue-600">
                    {cost.amount.toFixed(3)} {cost.unit}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="text-center py-3 text-gray-500">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Refresh Button */}
      <div className="mt-10 text-center">
        <button
          onClick={fetchBillingMetrics}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Refresh Metrics
        </button>
      </div>
    </div>
  );
};

export default BillingMetricsPage;