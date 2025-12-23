import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Home, 
  ShoppingCart, 
  Package, 
  Users, 
  ClipboardList, 
  DollarSign, 
  Wallet, 
  FileText, 
  Truck,
  Settings,
  Bell,
  Search,
  Plus,
  Edit,
  Trash2,
  Printer,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  Lock,
  Unlock,
  Calendar,
  BarChart3,
  Palette,
  Volume2,
  Upload,
  Shield,
  TestTube,
  Link,
  Database
} from "lucide-react";
import { useStore } from "@/lib/store";


export default function Manual() {
  const { companySettings } = useStore();

  const handleDownloadPDF = (scrollToSection?: string) => {
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Manual do Sistema - ${companySettings.name || 'Sistema PDV'}</title>
        <style>
          @page { margin: 20mm; size: A4; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
          }
          .btn-container {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
          }
          .print-btn { 
            padding: 12px 24px; 
            background: #22c55e; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            font-size: 16px; 
            font-weight: bold; 
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          .close-btn { 
            padding: 12px 24px; 
            background: #ef4444; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            font-size: 16px; 
            font-weight: bold; 
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          @media print { 
            .btn-container { display: none !important; }
            body { padding: 0; }
          }
          .cover { 
            text-align: center; 
            padding: 60px 20px; 
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); 
            color: white; 
            border-radius: 16px; 
            margin-bottom: 40px;
            page-break-after: always;
          }
          .cover h1 { font-size: 2.5em; margin-bottom: 10px; }
          .cover p { font-size: 1.2em; opacity: 0.9; }
          h1 { color: #1e40af; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; margin-top: 40px; }
          h2 { color: #2563eb; margin-top: 30px; }
          h3 { color: #3b82f6; margin-top: 20px; }
          .section { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 12px; 
            margin: 20px 0; 
            border-left: 4px solid #3b82f6;
            page-break-inside: avoid;
          }
          .feature-list { margin: 15px 0; }
          .feature-item { 
            padding: 12px 15px; 
            margin: 8px 0; 
            background: white; 
            border-radius: 8px; 
            border: 1px solid #e2e8f0;
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }
          .feature-icon { 
            width: 24px; 
            height: 24px; 
            background: #dbeafe; 
            border-radius: 6px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            flex-shrink: 0;
            font-size: 12px;
          }
          .button-desc {
            background: #e0f2fe;
            padding: 8px 12px;
            border-radius: 6px;
            margin: 5px 0;
            font-size: 0.9em;
          }
          .button-name { 
            font-weight: bold; 
            color: #0369a1;
          }
          .tip { 
            background: #fef3c7; 
            border-left: 4px solid #f59e0b; 
            padding: 15px; 
            margin: 15px 0; 
            border-radius: 8px;
          }
          .tip strong { color: #b45309; }
          .warning { 
            background: #fee2e2; 
            border-left: 4px solid #ef4444; 
            padding: 15px; 
            margin: 15px 0; 
            border-radius: 8px;
          }
          .warning strong { color: #dc2626; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0; 
            background: white;
            border-radius: 8px;
            overflow: hidden;
          }
          th { 
            background: #3b82f6; 
            color: white; 
            padding: 12px; 
            text-align: left; 
          }
          td { 
            padding: 10px 12px; 
            border-bottom: 1px solid #e2e8f0; 
          }
          tr:nth-child(even) { background: #f8fafc; }
          .toc { 
            background: #f1f5f9; 
            padding: 20px 30px; 
            border-radius: 12px; 
            margin: 20px 0;
          }
          .toc h2 { margin-top: 0; }
          .toc ul { list-style: none; padding: 0; }
          .toc li { 
            padding: 8px 0; 
            border-bottom: 1px dashed #cbd5e1;
          }
          .toc a { 
            color: #2563eb; 
            text-decoration: none; 
          }
          .page-break { page-break-before: always; }
          .footer {
            text-align: center;
            padding: 20px;
            margin-top: 40px;
            border-top: 2px solid #e2e8f0;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="btn-container">
          <button class="close-btn" onclick="window.close()">✕ Fechar</button>
          <button class="print-btn" onclick="window.print()">📥 Salvar como PDF</button>
        </div>

        <!-- CAPA -->
        <div class="cover">
          <h1>📋 MANUAL DO USUÁRIO</h1>
          <p>${companySettings.name || 'Sistema PDV'}</p>
          <p style="margin-top: 30px; font-size: 0.9em;">Sistema de Gestão Completo para Gráficas</p>
          <p style="margin-top: 10px; font-size: 0.8em; opacity: 0.8;">Versão 1.0 | ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <!-- ÍNDICE -->
        <div class="toc">
          <h2>📚 Índice</h2>
          <ul>
            <li>1. <a href="#dashboard">Dashboard - Painel Principal</a></li>
            <li>2. <a href="#vendas">Vendas - PDV</a></li>
            <li>3. <a href="#produtos">Produtos e Estoque</a></li>
            <li>4. <a href="#clientes">Clientes</a></li>
            <li>5. <a href="#ordens">Ordens de Serviço</a></li>
            <li>6. <a href="#financeiro">Financeiro</a></li>
            <li>7. <a href="#caixa">Controle de Caixa</a></li>
            <li>8. <a href="#comissoes">Comissões</a></li>
            <li>9. <a href="#relatorios">Relatórios</a></li>
            <li>10. <a href="#fornecedores">Fornecedores</a></li>
            <li>11. <a href="#configuracoes">Configurações</a></li>
            <li>12. <a href="#perfis">Perfis de Usuário</a></li>
            <li>13. <a href="#seguranca">Segurança e Multi-tenant</a></li>
            <li>14. <a href="#backup">Backup e Recuperação</a></li>
            <li>15. <a href="#testes">Qualidade e Testes</a></li>
            <li>16. <a href="#integracao">Integrações</a></li>
            <li>17. <a href="#dicas">Dicas e Atalhos</a></li>
          </ul>
        </div>

        <!-- 1. DASHBOARD -->
        <div class="page-break" id="dashboard">
          <h1>1. 🏠 Dashboard - Painel Principal</h1>
          <p>O Dashboard é a primeira tela que você vê ao entrar no sistema. Ele mostra um resumo completo das suas operações do dia.</p>
          
          <div class="section">
            <h3>📊 Cards de Resumo</h3>
            <div class="feature-list">
              <div class="feature-item">
                <div class="feature-icon">💰</div>
                <div>
                  <strong>Vendas do Dia</strong><br/>
                  Mostra o valor total das vendas realizadas hoje. Clique para ver a lista detalhada de todos os pedidos do dia.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">✅</div>
                <div>
                  <strong>Recebido Hoje</strong><br/>
                  Valor efetivamente recebido (pago) nos pedidos de hoje. Inclui pagamentos parciais.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">⏳</div>
                <div>
                  <strong>Em Produção</strong><br/>
                  Quantidade de pedidos que estão sendo produzidos no momento.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">🎯</div>
                <div>
                  <strong>Finalizadas</strong><br/>
                  Pedidos prontos para entrega aguardando o cliente retirar.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">📋</div>
                <div>
                  <strong>Total de Pedidos</strong><br/>
                  Número total de pedidos cadastrados no sistema.
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>📈 Gráficos</h3>
            <p>O Dashboard exibe gráficos interativos que mostram:</p>
            <ul>
              <li><strong>Vendas por Período:</strong> Compare vendas da semana, mês ou ano</li>
              <li><strong>Formas de Pagamento:</strong> Veja a distribuição entre Dinheiro, PIX e Cartão</li>
              <li><strong>Status dos Pedidos:</strong> Acompanhe quantos pedidos estão em cada etapa</li>
            </ul>
          </div>

          <div class="section">
            <h3>🖨️ Botões de Impressão</h3>
            <div class="button-desc">
              <span class="button-name">Imprimir Relatório do Dia:</span> Gera um relatório com todas as vendas do dia para impressão.
            </div>
            <div class="button-desc">
              <span class="button-name">Imprimir Recebimentos:</span> Lista apenas os valores efetivamente recebidos hoje.
            </div>
          </div>

          <div class="tip">
            <strong>💡 Dica:</strong> Clique em qualquer card para ver mais detalhes. Por exemplo, clicando em "Vendas do Dia" você verá todos os pedidos realizados hoje.
          </div>
        </div>

        <!-- 2. VENDAS -->
        <div class="page-break" id="vendas">
          <h1>2. 🛒 Vendas - PDV</h1>
          <p>A tela de Vendas é o coração do sistema, onde você registra todas as vendas da sua gráfica.</p>
          
          <div class="section">
            <h3>📂 Navegação por Categorias</h3>
            <p>O sistema organiza os produtos em três níveis:</p>
            <ol>
              <li><strong>Categorias:</strong> Ex: Comunicação Visual, Gráfica Rápida, Papelaria</li>
              <li><strong>Subcategorias:</strong> Ex: Banners, Cartões de Visita, Adesivos</li>
              <li><strong>Produtos:</strong> O item específico com preço</li>
            </ol>
          </div>

          <div class="section">
            <h3>🔍 Barra de Busca</h3>
            <p>Digite o nome de qualquer produto para encontrá-lo rapidamente. A busca funciona em todas as categorias simultaneamente.</p>
          </div>

          <div class="section">
            <h3>🛍️ Como Adicionar Itens ao Carrinho</h3>
            <ol>
              <li>Clique na <strong>Categoria</strong> desejada</li>
              <li>Clique na <strong>Subcategoria</strong> (se houver)</li>
              <li>Clique no <strong>Produto</strong></li>
              <li>Na janela que abre, defina:
                <ul>
                  <li><strong>Quantidade:</strong> Número de unidades</li>
                  <li><strong>Variação:</strong> Se o produto tiver opções (ex: tamanhos diferentes)</li>
                  <li><strong>Medidas:</strong> Para produtos por metro (largura x altura)</li>
                  <li><strong>Acabamento:</strong> Ilhós, laminação, etc.</li>
                  <li><strong>Observações:</strong> Detalhes especiais do pedido</li>
                </ul>
              </li>
              <li>Clique em <strong>Adicionar ao Carrinho</strong></li>
            </ol>
          </div>

          <div class="section">
            <h3>🧾 Carrinho de Compras</h3>
            <p>O carrinho fica na lateral direita (ou inferior no celular) e mostra:</p>
            <ul>
              <li>Lista de todos os itens adicionados</li>
              <li>Quantidade e preço de cada item</li>
              <li>Botões para remover itens ( - ou lixeira)</li>
              <li><strong>Total geral</strong> do pedido</li>
            </ul>
          </div>

          <div class="section">
            <h3>💳 Finalizar Venda</h3>
            <div class="button-desc">
              <span class="button-name">Botão "Finalizar Venda":</span> Abre a tela de pagamento
            </div>
            <p>Na tela de pagamento você define:</p>
            <ul>
              <li><strong>Cliente:</strong> Selecione ou cadastre um novo cliente</li>
              <li><strong>Vendedor:</strong> Quem está realizando a venda</li>
              <li><strong>Forma de Pagamento:</strong> Dinheiro, PIX ou Cartão</li>
              <li><strong>Valor Pago:</strong> Quanto o cliente está pagando agora</li>
              <li><strong>Parcelamento:</strong> Para pagamentos em cartão</li>
            </ul>
          </div>

          <div class="section">
            <h3>⚡ Botões Especiais</h3>
            <div class="button-desc">
              <span class="button-name">Venda Rápida:</span> Registra uma venda avulsa sem selecionar produto do catálogo. Útil para serviços personalizados.
            </div>
            <div class="button-desc">
              <span class="button-name">Gerenciar Categorias:</span> Abre o gerenciador para criar, editar ou excluir categorias. Você pode excluir categorias mesmo que tenham subcategorias ou produtos - os produtos serão movidos para "Sem Categoria".
            </div>
            <div class="button-desc">
              <span class="button-name">Gerenciar Subcategorias:</span> Abre o gerenciador para criar, editar ou excluir subcategorias dentro de cada categoria.
            </div>
            <div class="button-desc">
              <span class="button-name">Gerenciar Produtos:</span> Abre o gerenciador de produtos com listagem completa e barra de rolagem para ver todos os itens.
            </div>
          </div>

          <div class="section">
            <h3>📝 Edição de Categorias</h3>
            <p>Ao editar uma categoria, o sistema atualiza automaticamente:</p>
            <ul>
              <li>O nome da categoria na tabela de categorias</li>
              <li>Todos os produtos que usam essa categoria</li>
            </ul>
            <p>Ao excluir uma categoria:</p>
            <ul>
              <li>Todas as subcategorias serão removidas</li>
              <li>Os produtos serão movidos para "Sem Categoria"</li>
            </ul>
          </div>

          <div class="tip">
            <strong>💡 Dica:</strong> Para editar um pedido já finalizado, vá em "Ordens de Serviço", encontre o pedido e clique no botão de editar.
          </div>
        </div>

        <!-- 3. PRODUTOS -->
        <div class="page-break" id="produtos">
          <h1>3. 📦 Produtos e Estoque</h1>
          <p>Gerencie todo o catálogo de produtos e serviços da sua gráfica.</p>
          
          <div class="section">
            <h3>📋 Lista de Produtos</h3>
            <p>A tabela mostra todos os produtos cadastrados com:</p>
            <ul>
              <li><strong>Nome:</strong> Nome do produto</li>
              <li><strong>Categoria/Subcategoria:</strong> Classificação do produto</li>
              <li><strong>Preço:</strong> Valor unitário ou por m²</li>
              <li><strong>Estoque:</strong> Quantidade disponível</li>
              <li><strong>Status:</strong> Em Estoque, Estoque Baixo ou Esgotado</li>
            </ul>
          </div>

          <div class="section">
            <h3>➕ Cadastrar Novo Produto</h3>
            <p>Clique em <strong>"Novo Produto"</strong> e preencha:</p>
            <table>
              <tr><th>Campo</th><th>Descrição</th></tr>
              <tr><td>Nome</td><td>Nome do produto (obrigatório)</td></tr>
              <tr><td>Categoria</td><td>Selecione ou crie uma nova (obrigatório)</td></tr>
              <tr><td>Subcategoria</td><td>Opcional, para organização</td></tr>
              <tr><td>Tipo</td><td>Produto ou Serviço</td></tr>
              <tr><td>Modo de Cálculo</td><td>Por quantidade ou por metro quadrado</td></tr>
              <tr><td>Preço</td><td>Valor unitário ou por m² (obrigatório)</td></tr>
              <tr><td>Estoque</td><td>Quantidade inicial</td></tr>
              <tr><td>Descrição</td><td>Detalhes adicionais</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>📥 Importar/Exportar</h3>
            <div class="button-desc">
              <span class="button-name">Exportar:</span> Baixa todos os produtos em arquivo Excel.
            </div>
            <div class="button-desc">
              <span class="button-name">Template:</span> Baixa um modelo de planilha para importação.
            </div>
            <div class="button-desc">
              <span class="button-name">Importar:</span> Envia uma planilha Excel para cadastrar produtos em massa.
            </div>
          </div>

          <div class="section">
            <h3>✏️ Editar e Excluir</h3>
            <p>Use os ícones na coluna de ações:</p>
            <div class="button-desc">
              <span class="button-name">Lápis (✏️):</span> Edita o produto selecionado.
            </div>
            <div class="button-desc">
              <span class="button-name">Lixeira (🗑️):</span> Exclui o produto (pede confirmação).
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Atenção:</strong> Excluir um produto não afeta pedidos já realizados com ele, mas ele não aparecerá mais no PDV.
          </div>
        </div>

        <!-- 4. CLIENTES -->
        <div class="page-break" id="clientes">
          <h1>4. 👥 Clientes</h1>
          <p>Mantenha um cadastro organizado de todos os seus clientes.</p>
          
          <div class="section">
            <h3>📋 Lista de Clientes</h3>
            <p>Visualize todos os clientes com:</p>
            <ul>
              <li><strong>Nome:</strong> Nome completo</li>
              <li><strong>CPF/CNPJ:</strong> Documento</li>
              <li><strong>Telefone:</strong> Contato principal</li>
              <li><strong>E-mail:</strong> Contato eletrônico</li>
              <li><strong>Status:</strong> Ativo/Inativo</li>
            </ul>
          </div>

          <div class="section">
            <h3>➕ Cadastrar Cliente</h3>
            <p>Clique em <strong>"Novo Cliente"</strong> e preencha:</p>
            <table>
              <tr><th>Campo</th><th>Obrigatório</th></tr>
              <tr><td>Nome Completo</td><td>✅ Sim</td></tr>
              <tr><td>CPF/CNPJ</td><td>Não</td></tr>
              <tr><td>Telefone</td><td>✅ Sim</td></tr>
              <tr><td>E-mail</td><td>Não</td></tr>
              <tr><td>Observações</td><td>Não</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>🔍 Buscar Cliente</h3>
            <p>Use a barra de busca para encontrar clientes por:</p>
            <ul>
              <li>Nome</li>
              <li>CPF/CNPJ</li>
              <li>E-mail</li>
            </ul>
          </div>

          <div class="tip">
            <strong>💡 Dica:</strong> Você também pode cadastrar clientes diretamente na tela de vendas, clicando no botão "+" ao lado do campo cliente.
          </div>
        </div>

        <!-- 5. ORDENS DE SERVIÇO -->
        <div class="page-break" id="ordens">
          <h1>5. 📋 Ordens de Serviço</h1>
          <p>Acompanhe todos os pedidos em formato de Kanban visual.</p>
          
          <div class="section">
            <h3>📊 Quadro Kanban</h3>
            <p>Os pedidos são organizados em colunas por status:</p>
            <table>
              <tr><th>Status</th><th>Cor</th><th>Significado</th></tr>
              <tr><td>AGUARDANDO</td><td>🟡 Amarelo</td><td>Pedido recebido, aguardando início</td></tr>
              <tr><td>EM PRODUÇÃO</td><td>🔵 Azul</td><td>Pedido está sendo produzido</td></tr>
              <tr><td>FINALIZADO</td><td>🟢 Verde</td><td>Pronto para entrega</td></tr>
              <tr><td>ENTREGUE</td><td>⚫ Cinza</td><td>Cliente retirou o pedido</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>👆 Mudar Status</h3>
            <p>Para alterar o status de um pedido:</p>
            <ol>
              <li>Clique no card do pedido</li>
              <li>Na janela de detalhes, clique no botão do próximo status</li>
              <li>Ou use o menu dropdown para selecionar qualquer status</li>
            </ol>
          </div>

          <div class="section">
            <h3>🖨️ Imprimir Documentos</h3>
            <p>Para cada pedido você pode imprimir:</p>
            <div class="button-desc">
              <span class="button-name">Ordem de Produção:</span> Documento para a produção (sem preços).
            </div>
            <div class="button-desc">
              <span class="button-name">Recibo:</span> Comprovante para o cliente.
            </div>
            <div class="button-desc">
              <span class="button-name">Pedido:</span> Documento completo com todos os detalhes.
            </div>
            <div class="button-desc">
              <span class="button-name">Orçamento:</span> Proposta para o cliente (válido por 7 dias).
            </div>
          </div>

          <div class="section">
            <h3>📲 WhatsApp</h3>
            <p>O botão do WhatsApp permite enviar mensagem direta para o cliente informando sobre o status do pedido.</p>
          </div>

          <div class="tip">
            <strong>💡 Dica:</strong> Use as abas no topo para filtrar apenas pedidos em produção, aguardando ou finalizados.
          </div>
        </div>

        <!-- 6. FINANCEIRO -->
        <div class="page-break" id="financeiro">
          <h1>6. 💰 Financeiro</h1>
          <p>Controle completo das finanças da sua empresa.</p>
          
          <div class="section">
            <h3>📊 Cards de Resumo</h3>
            <div class="feature-list">
              <div class="feature-item">
                <div class="feature-icon">💵</div>
                <div>
                  <strong>Saldo Atual</strong><br/>
                  Diferença entre entradas e saídas.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">📈</div>
                <div>
                  <strong>Entradas</strong><br/>
                  Total recebido das vendas. Clique para ver detalhes.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">📉</div>
                <div>
                  <strong>Saídas</strong><br/>
                  Total de despesas. Clique para ver detalhes.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">⏰</div>
                <div>
                  <strong>A Receber</strong><br/>
                  Valores pendentes de clientes.
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>📑 Abas</h3>
            <table>
              <tr><th>Aba</th><th>Conteúdo</th></tr>
              <tr><td>Movimentações</td><td>Histórico de todas as entradas e saídas</td></tr>
              <tr><td>A Receber</td><td>Lista de clientes com pagamentos pendentes</td></tr>
              <tr><td>A Pagar</td><td>Despesas futuras e contas a vencer</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>💳 Registrar Movimentações</h3>
            <div class="button-desc">
              <span class="button-name">+ Entrada:</span> Registra uma entrada manual de dinheiro.
            </div>
            <div class="button-desc">
              <span class="button-name">+ Saída:</span> Registra uma despesa ou pagamento.
            </div>
          </div>

          <div class="section">
            <h3>✅ Dar Baixa em Pendências</h3>
            <p>Na aba "A Receber", clique no botão <strong>"Dar Baixa"</strong> ao lado do pedido quando o cliente pagar. O sistema atualiza automaticamente o status do pagamento.</p>
          </div>

          <div class="warning">
            <strong>⚠️ Apenas Administradores e Gerentes</strong> têm acesso ao botão "Zerar", que limpa todos os dados locais.
          </div>
        </div>

        <!-- 7. CAIXA -->
        <div class="page-break" id="caixa">
          <h1>7. 🏦 Controle de Caixa</h1>
          <p>Gerencie o fluxo de caixa diário da sua empresa.</p>
          
          <div class="section">
            <h3>🔓 Status do Caixa</h3>
            <p>O caixa pode estar:</p>
            <ul>
              <li><strong>ABERTO (Verde):</strong> Operações normais</li>
              <li><strong>FECHADO (Vermelho):</strong> Sem operações</li>
            </ul>
            <p>Use os botões <strong>"Abrir Caixa"</strong> ou <strong>"Fechar Caixa"</strong> para alternar.</p>
          </div>

          <div class="section">
            <h3>💵 Saldo em Caixa</h3>
            <p>Mostra o valor atual em caixa, incluindo:</p>
            <ul>
              <li>Fundo de troco inicial (R$ 150,00)</li>
              <li>Entradas do dia (vendas)</li>
              <li>Menos as saídas (sangrias, despesas e comissões)</li>
            </ul>
          </div>

          <div class="section">
            <h3>💰 Operações</h3>
            <div class="button-desc">
              <span class="button-name">Suprimento:</span> Adiciona dinheiro ao caixa (ex: troco extra).
            </div>
            <div class="button-desc">
              <span class="button-name">Sangria:</span> Retira dinheiro do caixa (ex: pagamento de fornecedor).
            </div>
          </div>

          <div class="section">
            <h3>💸 Débito de Comissões</h3>
            <p>Se a empresa utiliza comissões (configurado em Configurações), o sistema automaticamente:</p>
            <ul>
              <li>Calcula as comissões sobre vendas pagas</li>
              <li>Exibe o valor de comissões no fluxo de caixa (em laranja)</li>
              <li>Inclui as comissões no total de saídas</li>
              <li>Mostra detalhamento no card "Total Saídas" e no resumo</li>
            </ul>
            <p>O percentual de comissão é definido nas configurações da empresa.</p>
            
            <div class="tip">
              <strong>💡 Dica:</strong> Clique em "Débito de Comissões" no fluxo de caixa para abrir um dialog detalhado mostrando todos os pedidos que geraram comissão, com informações do cliente, vendedor, valor pago e comissão de cada venda.
            </div>
          </div>

          <div class="section">
            <h3>📅 Gastos Fixos</h3>
            <p>Cadastre despesas mensais recorrentes como:</p>
            <ul>
              <li>Aluguel</li>
              <li>Energia</li>
              <li>Internet</li>
              <li>Outros</li>
            </ul>
            <p>O sistema aplica automaticamente no dia do vencimento.</p>
          </div>

          <div class="section">
            <h3>📋 Fluxo de Caixa</h3>
            <p>Lista todas as movimentações do dia com:</p>
            <ul>
              <li>Abertura de caixa (fundo de troco)</li>
              <li>Débito de comissões (se habilitado)</li>
              <li>Vendas e pagamentos recebidos</li>
              <li>Sangrias e despesas</li>
            </ul>
            <p>Cada item mostra: hora, descrição, cliente/fornecedor e valor (verde = entrada, vermelho = saída, laranja = comissão).</p>
            <p>Clique em qualquer linha para ver detalhes completos.</p>
          </div>

          <div class="section">
            <h3>📊 Cards de Resumo</h3>
            <div class="feature-list">
              <div class="feature-item">
                <div class="feature-icon">📈</div>
                <div>
                  <strong>Total Entradas</strong><br/>
                  Soma de todas as vendas e pagamentos recebidos. Clique para ver lista detalhada.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">📉</div>
                <div>
                  <strong>Total Saídas</strong><br/>
                  Soma de sangrias, despesas e comissões. Mostra separadamente o valor de comissões se habilitado.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">💵</div>
                <div>
                  <strong>Resultado</strong><br/>
                  Diferença entre entradas e saídas (lucro ou prejuízo do dia).
                </div>
              </div>
            </div>
          </div>

          <div class="tip">
            <strong>💡 Dica:</strong> No final do dia, clique em "Resultado" para ver o resumo completo de entradas, saídas e comissões.
          </div>
        </div>

        <!-- 8. COMISSÕES -->
        <div class="page-break" id="comissoes">
          <h1>8. 💵 Comissões</h1>
          <p>Gerencie as comissões de vendedores sobre as vendas realizadas.</p>
          
          <div class="section">
            <h3>⚙️ Ativando Comissões</h3>
            <p>Para usar o sistema de comissões:</p>
            <ol>
              <li>Acesse <strong>Configurações</strong></li>
              <li>Ative a opção <strong>"Usar Comissões"</strong></li>
              <li>Defina o <strong>Percentual de Comissão</strong> (ex: 10%)</li>
              <li>Salve as configurações</li>
            </ol>
          </div>

          <div class="section">
            <h3>📊 Visualizando Comissões</h3>
            <p>Acesse o menu <strong>"Comissões"</strong> para ver:</p>
            <ul>
              <li><strong>Total Vendido:</strong> Soma das vendas pagas no período</li>
              <li><strong>Total de Comissões:</strong> Valor calculado com base no percentual</li>
              <li><strong>Número de Vendas:</strong> Quantidade de pedidos no período</li>
              <li><strong>Taxa:</strong> Percentual configurado</li>
            </ul>
          </div>

          <div class="section">
            <h3>📅 Filtros</h3>
            <p>Use os filtros para refinar a visualização:</p>
            <ul>
              <li><strong>Mês/Ano:</strong> Selecione o período desejado</li>
              <li><strong>Vendedor:</strong> Veja comissões de um vendedor específico (Admin/Gerente)</li>
            </ul>
          </div>

          <div class="section">
            <h3>👥 Visão por Perfil</h3>
            <table>
              <tr><th>Perfil</th><th>Visualização</th></tr>
              <tr><td>Admin/Gerente</td><td>Vê comissões de todos os vendedores com resumo por pessoa</td></tr>
              <tr><td>Vendedor</td><td>Vê apenas suas próprias comissões e vendas</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>🏦 Comissões no Caixa</h3>
            <p>O valor total de comissões também aparece na tela de Caixa:</p>
            <ul>
              <li>No card <strong>"Total Saídas"</strong> - mostra o valor de comissões incluído</li>
              <li>No <strong>Fluxo de Caixa</strong> - aparece como "Débito de Comissões" em laranja (clicável)</li>
              <li>No <strong>Resumo do Caixa</strong> - detalhamento separado das comissões</li>
            </ul>
            <p>As comissões são calculadas automaticamente sobre o valor pago das vendas.</p>
            
            <h4>📋 Detalhamento de Comissões</h4>
            <p>Ao clicar em "Débito de Comissões" no fluxo de caixa, abre um dialog mostrando:</p>
            <ul>
              <li><strong>Lista de pedidos:</strong> Todos os pedidos que geraram comissão</li>
              <li><strong>Informações por pedido:</strong> Número do pedido, cliente, vendedor, valor pago e comissão</li>
              <li><strong>Resumo:</strong> Total de pedidos, valor total pago e comissão total</li>
              <li><strong>Ação:</strong> Clique em qualquer pedido para ver seus detalhes completos</li>
            </ul>
          </div>

          <div class="tip">
            <strong>💡 Dica:</strong> Clique no nome de um vendedor na tabela de resumo para ver todas as vendas que geraram comissão para ele.
          </div>
        </div>

        <!-- 9. RELATÓRIOS -->
        <div class="page-break" id="relatorios">
          <h1>9. 📊 Relatórios</h1>
          <p>Gere relatórios detalhados para análise do seu negócio.</p>
          
          <div class="section">
            <h3>📈 Tipos de Relatório</h3>
            <table>
              <tr><th>Relatório</th><th>Conteúdo</th></tr>
              <tr><td>Vendas</td><td>Total vendido, por período, vendedor e forma de pagamento</td></tr>
              <tr><td>Estoque</td><td>Produtos em estoque, valor total, itens com estoque baixo</td></tr>
              <tr><td>Inadimplência</td><td>Clientes com pagamentos pendentes</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>🔍 Filtros</h3>
            <p>Refine os relatórios usando:</p>
            <ul>
              <li><strong>Data Início:</strong> Filtra a partir desta data</li>
              <li><strong>Data Fim:</strong> Filtra até esta data</li>
              <li><strong>Vendedor:</strong> Mostra apenas vendas deste vendedor</li>
              <li><strong>Busca:</strong> Encontre itens específicos</li>
            </ul>
          </div>

          <div class="section">
            <h3>🖨️ Imprimir Relatório</h3>
            <p>Clique no botão <strong>"Imprimir"</strong> para gerar uma versão impressa do relatório atual com todos os filtros aplicados.</p>
          </div>

          <div class="section">
            <h3>📊 Relatório de Vendas - Detalhes</h3>
            <p>Inclui:</p>
            <ul>
              <li>Resumo geral (total vendido, recebido, pendente)</li>
              <li>Vendas por forma de pagamento</li>
              <li>Vendas por vendedor</li>
              <li>Lista detalhada de cada venda</li>
            </ul>
          </div>
        </div>

        <!-- 10. FORNECEDORES -->
        <div class="page-break" id="fornecedores">
          <h1>10. 🚚 Fornecedores</h1>
          <p>Cadastre e gerencie seus fornecedores.</p>
          
          <div class="section">
            <h3>📋 Lista de Fornecedores</h3>
            <p>Visualize todos os fornecedores com:</p>
            <ul>
              <li>Nome da empresa</li>
              <li>Contato</li>
              <li>Telefone</li>
              <li>E-mail</li>
            </ul>
          </div>

          <div class="section">
            <h3>➕ Cadastrar Fornecedor</h3>
            <p>Clique em <strong>"Novo Fornecedor"</strong> e preencha os dados. Os fornecedores aparecem no Financeiro ao registrar despesas.</p>
          </div>
        </div>

        <!-- 11. CONFIGURAÇÕES -->
        <div class="page-break" id="configuracoes">
          <h1>11. ⚙️ Configurações</h1>
          <p>Personalize o sistema de acordo com suas necessidades.</p>
          
          <div class="section">
            <h3>🏢 Dados da Empresa</h3>
            <p>Configure:</p>
            <ul>
              <li>Nome da empresa</li>
              <li>CNPJ</li>
              <li>Telefones (principal e secundário)</li>
              <li>E-mail</li>
              <li>Endereço</li>
              <li>Logotipo (aparece nos recibos)</li>
            </ul>
          </div>

          <div class="section">
            <h3>📦 Estoque</h3>
            <ul>
              <li><strong>Usar controle de estoque:</strong> Ativa/desativa o gerenciamento</li>
              <li><strong>Limite de estoque baixo:</strong> Define quando alertar sobre estoque</li>
            </ul>
          </div>

          <div class="section">
            <h3>🖨️ Impressão</h3>
            <ul>
              <li><strong>Exibir logo nos recibos:</strong> Mostra/oculta a logo</li>
              <li><strong>Imprimir automaticamente:</strong> Abre impressão após cada venda</li>
            </ul>
          </div>

          <div class="section">
            <h3>🔔 Notificações</h3>
            <p>Configure alertas para:</p>
            <ul>
              <li>Estoque baixo</li>
              <li>Novas vendas</li>
              <li>Pagamentos pendentes</li>
              <li>Mudança de status de pedidos</li>
            </ul>
          </div>

          <div class="section">
            <h3>👥 Usuários</h3>
            <p>Gerencie a equipe:</p>
            <ul>
              <li>Visualize todos os usuários</li>
              <li>Edite nome e função</li>
              <li>Crie novos usuários (Admin apenas)</li>
            </ul>
          </div>

          <div class="section">
            <h3>🎨 Aparência</h3>
            <p>Personalize as cores do sistema:</p>
            <ul>
              <li>Escolha entre temas pré-definidos</li>
              <li>Ou defina cores personalizadas</li>
            </ul>
          </div>

          <div class="section">
            <h3>🔊 Sons</h3>
            <p>Configure sons de clique e notificação:</p>
            <ul>
              <li>Ativar/desativar sons</li>
              <li>Ajustar volume</li>
              <li>Escolher tipo de som</li>
            </ul>
          </div>

          <div class="section">
            <h3>💵 Comissões</h3>
            <p>Configure o sistema de comissões:</p>
            <ul>
              <li><strong>Usar Comissões:</strong> Ativa/desativa o cálculo de comissões</li>
              <li><strong>Percentual:</strong> Define o percentual de comissão sobre vendas (ex: 10%)</li>
            </ul>
            <p>Quando ativado, o sistema calcula automaticamente as comissões sobre o valor pago das vendas e exibe no Caixa e na tela de Comissões.</p>
          </div>
        </div>

        <!-- 12. PERFIS -->
        <div class="page-break" id="perfis">
          <h1>12. 👤 Perfis de Usuário</h1>
          <p>O sistema possui três níveis de acesso:</p>
          
          <div class="section">
            <h3>👑 Administrador</h3>
            <ul>
              <li>Acesso total a todas as funcionalidades</li>
              <li>Pode criar e gerenciar usuários</li>
              <li>Pode excluir pedidos</li>
              <li>Pode zerar dados do sistema</li>
              <li>Pode alterar todas as configurações</li>
            </ul>
          </div>

          <div class="section">
            <h3>📊 Gerente</h3>
            <ul>
              <li>Acesso ao financeiro e caixa</li>
              <li>Pode ver relatórios completos</li>
              <li>Pode editar pedidos</li>
              <li>Pode gerenciar produtos e clientes</li>
              <li><strong>Não pode:</strong> Excluir pedidos, criar usuários</li>
            </ul>
          </div>

          <div class="section">
            <h3>🛒 Vendedor</h3>
            <ul>
              <li>Acesso à tela de vendas</li>
              <li>Vê apenas seus próprios pedidos</li>
              <li>Pode cadastrar clientes</li>
              <li><strong>Não pode:</strong> Ver financeiro, caixa ou relatórios completos</li>
            </ul>
          </div>
        </div>

        <!-- 13. SEGURANÇA -->
        <div class="page-break" id="seguranca">
          <h1>13. 🔒 Segurança e Multi-tenant</h1>
          <p>O sistema foi desenvolvido com segurança em primeiro lugar, utilizando as melhores práticas do mercado.</p>
          
          <div class="section">
            <h3>🏢 Isolamento Multi-tenant</h3>
            <p>Cada empresa (tenant) possui dados completamente isolados:</p>
            <ul>
              <li>Cada usuário pertence a uma empresa específica</li>
              <li>Dados de uma empresa nunca são visíveis para outra</li>
              <li>O isolamento é garantido no nível do banco de dados (RLS)</li>
            </ul>
          </div>

          <div class="section">
            <h3>🛡️ Row Level Security (RLS)</h3>
            <p>Todas as tabelas possuem políticas de segurança:</p>
            <table>
              <tr><th>Tabela</th><th>Proteção</th></tr>
              <tr><td>Clientes</td><td>Visíveis apenas para usuários do mesmo tenant</td></tr>
              <tr><td>Produtos</td><td>Isolados por empresa</td></tr>
              <tr><td>Pedidos</td><td>Vendedores veem apenas seus pedidos</td></tr>
              <tr><td>Financeiro</td><td>Restrito a Admin e Gerentes</td></tr>
              <tr><td>Configurações</td><td>Apenas Admin pode alterar</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>🔐 Autenticação</h3>
            <ul>
              <li><strong>Login seguro:</strong> Email + senha com criptografia</li>
              <li><strong>Login por nome:</strong> Vendedores podem entrar usando apenas o nome</li>
              <li><strong>Sessões:</strong> Tokens JWT com expiração automática</li>
              <li><strong>Proteção:</strong> Senhas verificadas contra vazamentos conhecidos</li>
            </ul>
          </div>

          <div class="section">
            <h3>🔑 Recuperação de Senha</h3>
            <p>O sistema oferece recuperação de senha automatizada:</p>
            <ul>
              <li><strong>Para Vendedores:</strong> Na tela de login, clique em "Esqueci minha senha" e digite o nome do usuário</li>
              <li><strong>Email Automático:</strong> O administrador recebe um email com o link de recuperação</li>
              <li><strong>Link Seguro:</strong> O link expira após uso único e redireciona para redefinir a senha</li>
              <li><strong>Para Admins:</strong> Na página de Configurações > Usuários, use o botão "Redefinir Senha"</li>
            </ul>
          </div>

          <div class="section">
            <h3>👥 Controle de Acesso por Papel</h3>
            <p>Os papéis são armazenados em tabela separada para evitar escalação de privilégios:</p>
            <ul>
              <li><strong>Admin:</strong> Acesso total, gerencia usuários, recebe emails de recuperação de senha</li>
              <li><strong>Gerente:</strong> Acesso financeiro, sem criar usuários</li>
              <li><strong>Vendedor:</strong> Apenas vendas e seus pedidos, pode solicitar recuperação de senha</li>
            </ul>
          </div>

          <div class="warning">
            <strong>⚠️ Importante:</strong> Nunca compartilhe suas credenciais de acesso. Cada usuário deve ter sua própria conta.
          </div>
        </div>

        <!-- 14. BACKUP -->
        <div class="page-break" id="backup">
          <h1>14. 💾 Backup e Recuperação</h1>
          <p>O sistema oferece funcionalidades de backup para proteção dos seus dados.</p>
          
          <div class="section">
            <h3>☁️ Backup Automático</h3>
            <p>Os dados são armazenados na nuvem com:</p>
            <ul>
              <li>Backups automáticos diários do banco de dados</li>
              <li>Replicação geográfica para redundância</li>
              <li>Histórico de versões para recuperação</li>
            </ul>
          </div>

          <div class="section">
            <h3>📥 Exportação de Dados</h3>
            <p>Você pode exportar seus dados a qualquer momento:</p>
            <div class="button-desc">
              <span class="button-name">Exportar Produtos:</span> Baixa planilha Excel com todos os produtos.
            </div>
            <div class="button-desc">
              <span class="button-name">Exportar Clientes:</span> Lista completa de clientes em Excel.
            </div>
            <div class="button-desc">
              <span class="button-name">Relatórios:</span> Podem ser impressos ou salvos como PDF.
            </div>
          </div>

          <div class="section">
            <h3>🔄 Sincronização</h3>
            <p>O sistema sincroniza automaticamente:</p>
            <ul>
              <li>Todas as alterações são salvas em tempo real</li>
              <li>Múltiplos usuários podem trabalhar simultaneamente</li>
              <li>Conflitos são resolvidos automaticamente</li>
            </ul>
          </div>

          <div class="tip">
            <strong>💡 Dica:</strong> Exporte seus dados periodicamente como backup adicional, especialmente antes de grandes alterações.
          </div>
        </div>

        <!-- 15. TESTES -->
        <div class="page-break" id="testes">
          <h1>15. ✅ Qualidade e Testes</h1>
          <p>O sistema passa por rigorosos testes de qualidade para garantir seu funcionamento correto.</p>
          
          <div class="section">
            <h3>🧪 Testes Automatizados</h3>
            <p>O sistema possui uma suíte completa de testes:</p>
            <table>
              <tr><th>Tipo de Teste</th><th>Cobertura</th></tr>
              <tr><td>Testes Unitários</td><td>Funções de cálculo, validação e utilidades</td></tr>
              <tr><td>Testes de Integração</td><td>Fluxos de vendas, pedidos e financeiro</td></tr>
              <tr><td>Testes de Componentes</td><td>Interface do usuário (botões, formulários, etc.)</td></tr>
              <tr><td>Testes End-to-End</td><td>Fluxos completos do usuário</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>📋 Áreas Testadas</h3>
            <div class="feature-list">
              <div class="feature-item">
                <div class="feature-icon">🛒</div>
                <div>
                  <strong>Fluxo de Vendas</strong><br/>
                  Carrinho, cálculos de preço, descontos, pagamentos múltiplos.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">📋</div>
                <div>
                  <strong>Ordens de Serviço</strong><br/>
                  Criação, transições de status, pagamentos parciais.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">👥</div>
                <div>
                  <strong>Gestão de Clientes</strong><br/>
                  Cadastro, busca, validação de CPF, telefone e email.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">📦</div>
                <div>
                  <strong>Controle de Estoque</strong><br/>
                  Movimentações, alertas de estoque baixo, variações.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">💰</div>
                <div>
                  <strong>Financeiro</strong><br/>
                  Cálculos de lucro, relatórios, fluxo de caixa.
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">🔐</div>
                <div>
                  <strong>Autenticação</strong><br/>
                  Login, logout, validação de credenciais.
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>📱 Testes de Responsividade</h3>
            <p>O sistema é testado em múltiplos dispositivos:</p>
            <ul>
              <li><strong>Desktop:</strong> Chrome, Firefox, Safari, Edge</li>
              <li><strong>Tablet:</strong> iPad, tablets Android</li>
              <li><strong>Mobile:</strong> iPhone, smartphones Android</li>
            </ul>
          </div>

          <div class="section">
            <h3>♿ Acessibilidade</h3>
            <p>Verificações de acessibilidade incluem:</p>
            <ul>
              <li>Navegação por teclado</li>
              <li>Textos alternativos em imagens</li>
              <li>Contraste de cores adequado</li>
              <li>Estrutura de cabeçalhos correta</li>
            </ul>
          </div>

          <div class="tip">
            <strong>💡 Nota Técnica:</strong> Os testes são executados automaticamente antes de cada atualização do sistema.
          </div>
        </div>

        <!-- 16. INTEGRAÇÕES -->
        <div class="page-break" id="integracao">
          <h1>16. 🔗 Integrações</h1>
          <p>O sistema se integra com diversas ferramentas para ampliar suas funcionalidades.</p>
          
          <div class="section">
            <h3>📱 WhatsApp</h3>
            <p>Integração nativa com WhatsApp:</p>
            <ul>
              <li>Enviar notificação de pedido pronto</li>
              <li>Compartilhar orçamentos com clientes</li>
              <li>Abre diretamente no WhatsApp do cliente</li>
            </ul>
          </div>

          <div class="section">
            <h3>🖨️ Impressão</h3>
            <p>Documentos prontos para impressão:</p>
            <ul>
              <li>Ordens de produção</li>
              <li>Recibos de venda</li>
              <li>Orçamentos personalizados</li>
              <li>Relatórios gerenciais</li>
              <li>Este manual completo</li>
            </ul>
          </div>

          <div class="section">
            <h3>📊 Exportação Excel</h3>
            <p>Exporte dados para análise externa:</p>
            <ul>
              <li>Produtos e estoque</li>
              <li>Clientes</li>
              <li>Relatórios de vendas</li>
            </ul>
          </div>

          <div class="section">
            <h3>📲 PWA - Aplicativo</h3>
            <p>Instale como aplicativo nativo:</p>
            <ul>
              <li>Funciona offline (dados em cache)</li>
              <li>Ícone na tela inicial</li>
              <li>Notificações push</li>
              <li>Experiência de app nativo</li>
            </ul>
          </div>
        </div>

        <!-- 17. DICAS -->
        <div class="page-break" id="dicas">
          <h1>17. 💡 Dicas e Atalhos</h1>
          
          <div class="section">
            <h3>⌨️ Atalhos de Teclado</h3>
            <table>
              <tr><th>Atalho</th><th>Função</th></tr>
              <tr><td>Ctrl + K (ou ⌘ + K)</td><td>Abrir busca global</td></tr>
              <tr><td>F2</td><td>Venda rápida (na tela de vendas)</td></tr>
              <tr><td>Escape</td><td>Fechar diálogos/modais</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>📱 Uso no Celular</h3>
            <ul>
              <li>O sistema é totalmente responsivo</li>
              <li>Toque no menu hamburger (☰) para navegar</li>
              <li>Arraste para a direita para voltar</li>
              <li>Use gestos de pinça para zoom em relatórios</li>
            </ul>
          </div>

          <div class="section">
            <h3>🔍 Busca Global</h3>
            <p>A busca global (barra superior ou Ctrl+K) encontra:</p>
            <ul>
              <li>Clientes por nome ou documento</li>
              <li>Pedidos por número</li>
              <li>Produtos por nome</li>
              <li>Páginas do sistema</li>
            </ul>
          </div>

          <div class="section">
            <h3>🔔 Notificações</h3>
            <p>Fique atento às notificações do sistema:</p>
            <ul>
              <li>Sino no canto superior mostra alertas</li>
              <li>Número vermelho indica notificações não lidas</li>
              <li>Clique para ver detalhes e marcar como lida</li>
            </ul>
          </div>

          <div class="section">
            <h3>📲 Instalação como App</h3>
            <p>Este sistema pode ser instalado como aplicativo no celular:</p>
            <ol>
              <li>Acesse o sistema pelo navegador</li>
              <li>Clique em "Instalar" (aparece na página /instalar)</li>
              <li>Ou no menu do navegador, selecione "Adicionar à tela inicial"</li>
            </ol>
          </div>

          <div class="section">
            <h3>🎨 Personalização</h3>
            <ul>
              <li>Mude entre tema claro e escuro</li>
              <li>Configure cores personalizadas da empresa</li>
              <li>Adicione logo nos recibos</li>
            </ul>
          </div>

          <div class="tip">
            <strong>💡 Dica Final:</strong> Em caso de dúvidas, acesse a página de Configurações e clique em "Ajuda" para ver o tutorial de introdução novamente. Ou baixe este manual para consulta offline!
          </div>
        </div>

        <!-- FOOTER -->
        <div class="footer">
          <p><strong>${companySettings.name || 'Sistema PDV'}</strong></p>
          <p>Manual gerado em ${new Date().toLocaleString('pt-BR')}</p>
          <p>Para suporte, entre em contato conosco</p>
        </div>

      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Scroll to specific section if provided
    if (scrollToSection) {
      setTimeout(() => {
        const el = printWindow.document.getElementById(scrollToSection);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  return (
    <MainLayout title="Manual do Sistema">
      <div className="space-y-6">
        {/* Header */}
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">📋 Manual Completo do Sistema</h1>
              <p className="text-muted-foreground mt-1">
                Documentação detalhada de todas as funcionalidades
              </p>
            </div>
            <Button 
              onClick={() => handleDownloadPDF()}
              className="gap-2 gradient-primary text-primary-foreground"
              size="lg"
            >
              <Download className="h-5 w-5" />
              Baixar PDF Completo
            </Button>
          </div>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { icon: Home, title: "Dashboard", color: "text-blue-500", pdfSection: "dashboard" },
            { icon: ShoppingCart, title: "Vendas", color: "text-green-500", pdfSection: "vendas" },
            { icon: Package, title: "Produtos", color: "text-purple-500", pdfSection: "produtos" },
            { icon: Users, title: "Clientes", color: "text-orange-500", pdfSection: "clientes" },
            { icon: ClipboardList, title: "Ordens", color: "text-cyan-500", pdfSection: "ordens" },
            { icon: DollarSign, title: "Financeiro", color: "text-emerald-500", pdfSection: "financeiro" },
            { icon: Wallet, title: "Caixa", color: "text-yellow-500", pdfSection: "caixa" },
            { icon: FileText, title: "Relatórios", color: "text-pink-500", pdfSection: "relatorios" },
            { icon: Truck, title: "Fornecedores", color: "text-indigo-500", pdfSection: "fornecedores" },
            { icon: Settings, title: "Configurações", color: "text-gray-500", pdfSection: "configuracoes" },
            { icon: Shield, title: "Segurança", color: "text-red-500", pdfSection: "seguranca" },
            { icon: Database, title: "Backup", color: "text-teal-500", pdfSection: "backup" },
            { icon: TestTube, title: "Testes", color: "text-lime-500", pdfSection: "testes" },
            { icon: Link, title: "Integrações", color: "text-violet-500", pdfSection: "integracao" },
            { icon: Bell, title: "Notificações", color: "text-rose-500", pdfSection: "configuracoes" },
            { icon: Palette, title: "Temas", color: "text-fuchsia-500", pdfSection: "dicas" },
          ].map((item, i) => (
            <Card 
              key={i} 
              className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50"
              onClick={() => handleDownloadPDF(item.pdfSection)}
            >
              <item.icon className={`h-8 w-8 mx-auto mb-2 ${item.color}`} />
              <p className="text-sm font-medium">{item.title}</p>
            </Card>
          ))}
        </div>

        {/* Content Preview */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">📖 Conteúdo do Manual</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">1. Dashboard</h3>
                <p className="text-sm text-muted-foreground">Painel principal com resumo de vendas, pedidos e gráficos</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">2. Vendas (PDV)</h3>
                <p className="text-sm text-muted-foreground">Como realizar vendas, adicionar itens e finalizar pedidos</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">3. Produtos</h3>
                <p className="text-sm text-muted-foreground">Cadastro, importação/exportação e controle de estoque</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">4. Clientes</h3>
                <p className="text-sm text-muted-foreground">Cadastro e gerenciamento de clientes</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">5. Ordens de Serviço</h3>
                <p className="text-sm text-muted-foreground">Acompanhamento de pedidos em formato Kanban</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">6. Financeiro</h3>
                <p className="text-sm text-muted-foreground">Controle de entradas, saídas e contas a receber</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">7. Controle de Caixa</h3>
                <p className="text-sm text-muted-foreground">Fluxo de caixa, suprimentos, sangrias e gastos fixos</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">8. Relatórios</h3>
                <p className="text-sm text-muted-foreground">Relatórios de vendas, estoque e inadimplência</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">9. Fornecedores</h3>
                <p className="text-sm text-muted-foreground">Cadastro de fornecedores</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">10. Configurações</h3>
                <p className="text-sm text-muted-foreground">Dados da empresa, usuários, temas e notificações</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">11. Perfis de Usuário</h3>
                <p className="text-sm text-muted-foreground">Permissões de Admin, Gerente e Vendedor</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">12. Segurança</h3>
                <p className="text-sm text-muted-foreground">Multi-tenant, RLS e controle de acesso</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">13. Backup</h3>
                <p className="text-sm text-muted-foreground">Backup automático e exportação de dados</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">14. Qualidade e Testes</h3>
                <p className="text-sm text-muted-foreground">Testes automatizados, E2E e acessibilidade</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">15. Integrações</h3>
                <p className="text-sm text-muted-foreground">WhatsApp, impressão, Excel e PWA</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h3 className="font-medium">16. Dicas e Atalhos</h3>
                <p className="text-sm text-muted-foreground">Atalhos de teclado, busca global e personalização</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <h3 className="font-medium text-primary">🆕 Novidades</h3>
                <p className="text-sm text-muted-foreground">Recuperação de senha automática via email, login por nome, segurança aprimorada</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Info */}
        <Card className="p-6 text-center bg-muted/30 border-muted">
          <p className="text-sm text-muted-foreground">
            💡 Clique nos cards acima para abrir o manual na seção desejada, ou use o botão "Baixar PDF Completo" no topo da página.
          </p>
        </Card>
      </div>
    </MainLayout>
  );
}
