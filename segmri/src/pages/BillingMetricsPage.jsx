import React, { useState } from "react";

const BillingMetricsPage = () => {
  // Mock data for total cost and cost by service
  const [totalCosts, setTotalCosts] = useState([
    { service: "Total", amount: 0.192168956, unit: "USD" },
    { service: "Total", amount: 74.869085415, unit: "USD" },
  ]);

  const [serviceCosts, setServiceCosts] = useState([
    { service: "AWS Secrets Manager", amount: 0.0133333344, unit: "USD" },
    { service: "Amazon EC2 Container Registry (ECR)", amount: 0.01838342646, unit: "USD" },
    { service: "EC2 - Other", amount: 0.048061357, unit: "USD" },
    { service: "Amazon Elastic Compute Cloud - Compute", amount: 24.324275039, unit: "USD" },
    { service: "Amazon Elastic Load Balancing", amount: 15.0961665827, unit: "USD" },
    { service: "Amazon Route 53", amount: 1.0146888, unit: "USD" },
    { service: "Amazon Virtual Private Cloud", amount: 24.516388945, unit: "USD" },
    { service: "Tax", amount: 5.55, unit: "USD" },
  ]);

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">AWS Billing Metrics</h1>
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
            {totalCosts.map((cost, index) => (
              <tr
                key={index}
                className="border-t border-gray-200 hover:bg-gray-50"
              >
                <td className="py-2 px-4">{cost.service}</td>
                <td className="py-2 px-4 text-right font-medium text-green-600">
                  {cost.amount.toFixed(2)} {cost.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cost by Service Table */}
      <div className="bg-white shadow-md rounded-2xl p-4">
        <h2 className="text-lg font-medium mb-3 flex items-center gap-2">Billing by Service</h2>
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-2 px-4 text-left">Service</th>
              <th className="py-2 px-4 text-right">Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            {serviceCosts.map((cost, index) => (
              <tr
                key={index}
                className="border-t border-gray-200 hover:bg-gray-50"
              >
                <td className="py-2 px-4">{cost.service}</td>
                <td className="py-2 px-4 text-right font-medium text-blue-600">
                  {cost.amount.toFixed(3)} {cost.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Refresh Button */}
      <div className="mt-10 text-center">
        <button
          // onClick={fetchEcrMetrics}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Refresh Metrics
        </button>
      </div>      

    </div>
  );
};

export default BillingMetricsPage;