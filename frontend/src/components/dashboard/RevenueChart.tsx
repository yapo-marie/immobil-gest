import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const data = [
  { month: 'Jan', revenue: 12400000, expenses: 4200000 },
  { month: 'Fév', revenue: 13100000, expenses: 4800000 },
  { month: 'Mar', revenue: 14200000, expenses: 5100000 },
  { month: 'Avr', revenue: 13800000, expenses: 4600000 },
  { month: 'Mai', revenue: 15200000, expenses: 5300000 },
  { month: 'Juin', revenue: 16100000, expenses: 5800000 },
  { month: 'Juil', revenue: 15800000, expenses: 5200000 },
  { month: 'Aoû', revenue: 16400000, expenses: 5600000 },
  { month: 'Sep', revenue: 17200000, expenses: 6100000 },
  { month: 'Oct', revenue: 16800000, expenses: 5900000 },
  { month: 'Nov', revenue: 17600000, expenses: 6200000 },
  { month: 'Déc', revenue: 18200000, expenses: 6800000 },
];

export function RevenueChart() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Vue des revenus</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(220 70% 45%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(220 70% 45%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(35 90% 55%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(35 90% 55%)" stopOpacity={0}/>
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
                tickFormatter={(value) => `${(value / 1000000).toLocaleString('fr-FR')} M F CFA`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(0 0% 100%)',
                  border: '1px solid hsl(220 15% 90%)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px hsl(220 25% 10% / 0.1)'
                }}
                formatter={(value: number) => [`${value.toLocaleString('fr-FR')} F CFA`, '']}
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
              <Area 
                type="monotone" 
                dataKey="expenses" 
                stroke="hsl(35 90% 55%)" 
                fillOpacity={1} 
                fill="url(#colorExpenses)" 
                strokeWidth={2}
                name="Dépenses"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
