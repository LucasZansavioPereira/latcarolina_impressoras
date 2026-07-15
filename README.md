# PrinterGen — Sistema de Gerenciamento de Impressoras

Aplicação web desenvolvida em **Java + Spring Boot** para gerenciamento do parque de impressoras, permitindo o cadastro, consulta, edição e controle dos equipamentos utilizados pela equipe de TI.

A aplicação possui uma interface web integrada e utiliza **H2 Database** em modo arquivo, garantindo a persistência dos dados mesmo após reinicializações.

---

# Tecnologias

- Java 21
- Spring Boot
- Spring Data JPA
- Maven
- H2 Database
- HTML
- CSS
- JavaScript
- Bootstrap
- Apache POI (Importação e Exportação de Excel)

---

# Como executar

### Pré-requisitos

- Java 21 ou superior
- Maven

### Executando

```bash
cd printer-app
mvn spring-boot:run
```

A aplicação estará disponível em:

```
http://localhost:3080
```

Na primeira execução será criada automaticamente a pasta `data/`, contendo o banco de dados local.

---

# Funcionalidades

## Cadastro de Impressoras

- Cadastro de novas impressoras
- Edição de informações
- Exclusão de registros
- Consulta de equipamentos

## Controle de Equipamentos

Cada impressora possui informações como:

- Patrimônio
- Número de Série
- Marca
- Modelo
- Setor Atual
- Status

Status disponíveis:

- 🟢 Funcionando
- 🟡 Manutenção
- 🔴 Quebrada

Os cartões são destacados por cores de acordo com o status do equipamento.

---

## Busca e Filtros

- Pesquisa em tempo real
- Filtro por status
- Ordenação visual dos equipamentos

---

## Importação de Excel

É possível importar uma planilha contendo diversas impressoras de uma única vez.

Durante a importação, o sistema realiza:

- Leitura automática da planilha
- Cadastro em lote
- Validação dos dados
- Atualização do banco de dados

Formato suportado:

```
.xlsx
```

---

## Exportação de Excel

Todos os registros cadastrados podem ser exportados para uma planilha Excel.

O arquivo gerado contém informações como:

- Patrimônio
- Número de Série
- Marca
- Modelo
- Setor
- Status

Facilitando auditorias, inventários e compartilhamento dos dados.

---

# Estrutura do Projeto

```
printer-app/
│
├── pom.xml
│
├── src/main/java/com/printers/control/
│
├── controller/
│   └── PrinterController.java
│
├── service/
│   └── PrinterService.java
│
├── repository/
│   └── PrinterRepository.java
│
├── model/
│   └── Printer.java
│
├── util/
│   └── ExcelService.java
│
└── src/main/resources/
    ├── application.properties
    └── static/
        ├── index.html
        ├── style.css
        └── app.js
```

---

# API REST

| Método | Endpoint | Descrição |
|----------|-------------------------|------------------------------|
| GET | `/api/printers` | Lista todas as impressoras |
| GET | `/api/printers/{id}` | Busca uma impressora |
| POST | `/api/printers` | Cadastra uma impressora |
| PUT | `/api/printers/{id}` | Atualiza uma impressora |
| DELETE | `/api/printers/{id}` | Remove uma impressora |
| POST | `/api/printers/import` | Importa impressoras via Excel |
| GET | `/api/printers/export` | Exporta impressoras para Excel |

---

# Gerando o JAR

```bash
mvn clean package
```

Após a compilação:

```bash
java -jar target/printer-control-1.0.0.jar
```

---

# Objetivo

O PrinterGen foi desenvolvido para centralizar o gerenciamento de impressoras, substituindo controles manuais por uma aplicação web simples, organizada e de fácil utilização.

A solução auxilia a equipe de TI no controle dos equipamentos, reduzindo o tempo gasto com consultas, movimentações e inventários, além de facilitar a importação e exportação das informações por meio de planilhas Excel.
