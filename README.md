# Sorteador de Questões
Aplicação web para professores que aplicam provas orais e já usam o Obsidian para organizar questões. O sorteador carrega arquivos `.md` ou `.txt`, sorteia perguntas numeradas, controla o tempo de resposta, limita pulos e grava automaticamente o áudio da sessão do aluno para download.

## Como preparar o arquivo no Obsidian
- Crie uma nota por prova e liste as questões numeradas (`1. Pergunta`, `2) Pergunta` etc.). Linhas em branco ou começando com `#` são ignoradas.
- Exemplo:
```
1. Explique o conceito de entropia.
2. Diferencie calor e temperatura.
3) Dê um exemplo de reação endotérmica.
```
- Exporte ou copie a nota como `.md` (ou `.txt`). Não precisa ajustar nada além da numeração.

## Como usar
- Abra [index.html](index.html) no navegador (sem instalação) ou acesse diretamente no [GitHub Pages](https://ldebritto.github.io/sorteador/).
- Clique no botão `+` e escolha uma ou mais provas (arquivos `.md`/`.txt`).
- Se mais de um arquivo for carregado, selecione a prova no dropdown. Para uma única prova, ela é carregada automaticamente.
- Ajuste o tempo por questão (minutos) no campo "Timer (min)" antes de começar.
- Clique em `Próxima` ou pressione `Enter` para sortear a primeira questão. O timer inicia e a gravação de áudio começa automaticamente.
- Use o botão `Pular` ou pressione `Espaço` para pular uma questão (máximo 2 pulos por sessão).
- O botão `Pausar/Retomar` (tecla `p`) pausa apenas o cronômetro, mas não interrompe a gravação.
- Use o botão "desfazer" (ícone de seta circular ou tecla `z`) para voltar à questão anterior, caso necessário.
- A sessão termina quando o aluno responde 3 questões (sem contar as puladas). Isso pode acontecer em:
  - 3 questões sem pulos
  - 4 questões (3 respondidas + 1 pulada)
  - 5 questões (3 respondidas + 2 puladas)
- Ao finalizar, um resumo com todas as questões é exibido (questões puladas aparecem marcadas).
- Clique em `Nova Prova` (tecla `r`) para finalizar a sessão. O áudio é baixado automaticamente como `prova_<nome-do-arquivo>_<timestamp>.webm` (ou `.m4a` no Safari/iOS).

## Funcionalidades
- **Sorteio inteligente**: Questões não se repetem até que todas sejam usadas.
- **Gravação automática**: Inicia ao sortear a primeira questão e continua até clicar em "Nova Prova", capturando também o feedback final.
- **Indicadores visuais**: Bolinhas mostram progresso (verde = respondida, amarelo = pulada, azul = atual).
- **Avisos sonoros**: Sinais aos 60s e 30s restantes, além de sons ao iniciar e finalizar cada questão.
- **Timer colorido**: Verde (normal), amarelo (≤60s), vermelho (≤30s).
- **Atalhos de teclado**:
  - `Enter` - Próxima questão
  - `Espaço` - Pular questão
  - `z` - Desfazer última ação
  - `p` - Pausar/Retomar timer
  - `r` - Nova prova
- **Função desfazer**: Volta à questão anterior, revertendo o progresso e ajustando pulos automaticamente.
- **Múltiplos arquivos**: Carregue várias provas e alterne entre elas no dropdown.

## Dicas rápidas
- Configure as permissões de microfone do navegador antes de iniciar para evitar interrupções.
- O campo de tempo e o botão de carregar arquivos ficam ocultos após iniciar uma sessão.
- Use "Nova Prova" entre alunos para resetar completamente a sessão e salvar o áudio.
- Mantenha um arquivo por turma ou prova; carregue vários para alternar rapidamente.
- A gravação captura toda a sessão, incluindo o feedback final que você der ao aluno após o resumo.
