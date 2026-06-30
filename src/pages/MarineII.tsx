import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, Loader2, Anchor } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FinanceContext {
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  totalDebts: number;
  ccBalance: number;
  totalAccountBalance: number;
  disponible: number;
}

export default function MarineIIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy Marine II, tu asistente financiera personal. Puedes preguntarme sobre tus ingresos, gastos, ahorros, deudas o pedirme consejos para mejorar tus finanzas. ¿En qué puedo ayudarte?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [financeCtx, setFinanceCtx] = useState<FinanceContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadFinanceContext = useCallback(async () => {
    setCtxLoading(true);
    try {
      const [
        { getIncomes, getExpenses, getSavings, getDebts, getCCTransactions, getBankAccounts, getUpcomingPayments, getAllDebtPaymentsTotal, getTotalPaidUpcomingPayments, getTotalSavingsDeposits, computeAccountBalance, getNextQuincena, generateRecurringInstances },
      ] = await Promise.all([
        import('@/data/finance'),
      ]);

      const [incomes, expenses, savings, debts, ccTx, accounts, upcomingPayments, debtPaymentsTotal, paidPayments, savDeposits] = await Promise.all([
        getIncomes(), getExpenses(), getSavings(), getDebts(), getCCTransactions(), getBankAccounts(), getUpcomingPayments(),
        getAllDebtPaymentsTotal(), getTotalPaidUpcomingPayments(), getTotalSavingsDeposits(),
      ]);

      const totalIncome = incomes.reduce((s: number, r: any) => s + Number(r.amount), 0);
      const totalExpenseBase = expenses.reduce((s: number, r: any) => s + Number(r.amount), 0);
      const ccPurchases = ccTx.filter((t: any) => t.transaction_type === 'purchase').reduce((s: number, t: any) => s + Number(t.amount), 0);
      const ccPayments = ccTx.filter((t: any) => t.transaction_type === 'payment').reduce((s: number, t: any) => s + Number(t.amount), 0);
      const ccBalance = ccPurchases - ccPayments;
      const totalSavings = savings.reduce((s: number, r: any) => s + Number(r.current_amount), 0);
      const totalDebts = debts.filter((d: any) => d.status === 'active').reduce((s: number, d: any) => s + Number(d.remaining_amount), 0);
      const totalExpense = totalExpenseBase + ccPayments + debtPaymentsTotal + paidPayments + savDeposits;
      const totalAccountBalance = accounts.reduce((s: number, a: any) => s + computeAccountBalance(a, incomes, expenses, [], ccTx, []), 0);

      const allInstances = generateRecurringInstances(upcomingPayments);
      const pendingPayments = allInstances.filter((p: any) => !p.is_paid);
      const nextQ = getNextQuincena();
      const qStr = `${nextQ.getFullYear()}-${String(nextQ.getMonth() + 1).padStart(2, '0')}-${String(nextQ.getDate()).padStart(2, '0')}`;
      const todayStr = new Date().toISOString().split('T')[0];
      const quincenaTotal = pendingPayments
        .filter((p: any) => p.due_date >= todayStr && p.due_date <= qStr)
        .reduce((s: number, p: any) => s + Number(p.amount), 0);

      const disponible = totalAccountBalance - ccBalance - quincenaTotal;

      setFinanceCtx({
        totalIncome,
        totalExpense,
        totalSavings,
        totalDebts,
        ccBalance,
        totalAccountBalance,
        disponible,
      });
    } catch (err) {
      console.error('Error loading finance context:', err);
    } finally {
      setCtxLoading(false);
    }
  }, []);

  useEffect(() => { loadFinanceContext(); }, [loadFinanceContext]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || !financeCtx) return;

    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const supabase = (await import('@/integrations/supabase/client')).supabase;

      const { data, error } = await supabase.functions.invoke('marine-ii-chat', {
        body: {
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          financeContext: financeCtx,
        },
      });

      if (error) throw new Error(error.message);

      const reply = data?.reply || 'Lo siento, no pude procesar tu mensaje. Intenta de nuevo.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Ocurrió un error al comunicarme con Marine II. Por favor intenta de nuevo más tarde.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
          <Anchor className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Marine II</h1>
          <p className="text-xs text-muted-foreground">
            {ctxLoading
              ? 'Cargando tus datos financieros...'
              : 'Asistente financiero personal — pregúntame lo que quieras'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4" ref={scrollRef}>
        <div className="space-y-4 px-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted/50 text-foreground rounded-bl-md border border-border/50'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 shrink-0 mt-1">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="pt-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ctxLoading ? 'Cargando datos financieros...' : 'Pregúntale a Marine II...'}
            disabled={loading || ctxLoading}
            className="flex-1 h-11 text-sm"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading || ctxLoading}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
