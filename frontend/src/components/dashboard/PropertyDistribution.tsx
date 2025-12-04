import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const data = [
  { name: 'Occupés', value: 18, color: 'hsl(145 65% 42%)' },
  { name: 'Disponibles', value: 4, color: 'hsl(220 70% 45%)' },
  { name: 'En maintenance', value: 2, color: 'hsl(38 92% 50%)' },
];

export function PropertyDistribution() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Statut des biens</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(0 0% 100%)',
                  border: '1px solid hsl(220 15% 90%)',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
