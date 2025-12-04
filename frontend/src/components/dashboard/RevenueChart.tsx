import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RevenuePoint = { label: string; revenue: number };

interface RevenueChartProps {
  data: RevenuePoint[];
  loading?: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const chartData =
    data.length > 0
      ? data.map((point) => ({ month: point.label, revenue: point.revenue }))
      : [
          { month: "Jan", revenue: 0 },
          { month: "Fév", revenue: 0 },
          { month: "Mar", revenue: 0 },
          { month: "Avr", revenue: 0 },
          { month: "Mai", revenue: 0 },
          { month: "Juin", revenue: 0 },
        ];

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Vue des revenus {loading && "(chargement...)"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(220 70% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(220 70% 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
              <XAxis
                dataKey="month"
                stroke="hsl(220 10% 45%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(220 10% 45%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value.toLocaleString("fr-FR")} F CFA`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0 0% 100%)",
                  border: "1px solid hsl(220 15% 90%)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px hsl(220 25% 10% / 0.1)",
                }}
                formatter={(value: number) => [`${value.toLocaleString("fr-FR")} F CFA`, "Revenus"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(220 70% 45%)"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={2}
                name="Revenus"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
