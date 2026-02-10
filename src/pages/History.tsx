import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPayments, getPlatforms, formatCurrency } from '@/data/store';
import { PaymentRecord } from '@/data/models';

export default function HistoryPage() {
  const [payments] = useState<PaymentRecord[]>(() => getPayments());
  const platforms = useMemo(() => getPlatforms(), []);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return payments.filter(p => {
      if (filterPlatform !== 'all' && p.platformId !== filterPlatform) return false;
      if (filterCurrency !== 'all' && p.currency !== filterCurrency) return false;
      if (search && !p.platformName.toLowerCase().includes(search.toLowerCase()) && !p.periodCovered.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [payments, filterPlatform, filterCurrency, search]);

  const totalUSD = filtered.filter(p => p.currency === 'USD').reduce((s, p) => s + p.amount, 0);
  const totalCOP = filtered.filter(p => p.currency === 'COP').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Histórico de Pagos</h1>
        <p className="text-sm text-muted-foreground">{payments.length} pagos registrados</p>
      </div>

      {/* Filters */}
      <Card className="card-metallic">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-secondary/50" />
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-full sm:w-52 bg-secondary/50"><SelectValue placeholder="Plataforma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las plataformas</SelectItem>
                {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCurrency} onValueChange={setFilterCurrency}>
              <SelectTrigger className="w-full sm:w-32 bg-secondary/50"><SelectValue placeholder="Moneda" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="COP">COP</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(totalUSD > 0 || totalCOP > 0) && (
            <div className="flex gap-4 mt-3 text-sm">
              {totalUSD > 0 && <span className="text-muted-foreground">Total USD: <span className="font-mono-data text-foreground">{formatCurrency(totalUSD, 'USD')}</span></span>}
              {totalCOP > 0 && <span className="text-muted-foreground">Total COP: <span className="font-mono-data text-foreground">{formatCurrency(totalCOP, 'COP')}</span></span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-metallic overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Plataforma</TableHead>
                <TableHead className="text-muted-foreground">Fecha de pago</TableHead>
                <TableHead className="text-muted-foreground hidden sm:table-cell">Periodo</TableHead>
                <TableHead className="text-muted-foreground">Monto</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">Comentario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="border-border hover:bg-secondary/30">
                  <TableCell className="font-medium text-foreground">{p.platformName}</TableCell>
                  <TableCell className="font-mono-data text-sm text-muted-foreground">{p.paymentDate}</TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">{p.periodCovered}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono-data bg-secondary/50">{formatCurrency(p.amount, p.currency)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{p.comment || '—'}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No se encontraron pagos</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
