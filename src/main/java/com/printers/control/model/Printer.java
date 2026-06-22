package com.printers.control.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

@Entity
@Table(name = "printers")
public class Printer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotBlank(message = "O código da impressora é obrigatório")
    @Column(nullable = false, unique = true)
    private String codigo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.FUNCIONANDO;

    @Column(length = 1000)
    private String problema;

    private String setorAntigo;

    private String setorNovo;

    private String marcaModelo;

    @Column(updatable = false)
    private Instant createdAt;

    private Instant updatedAt;

    public enum Status {
        FUNCIONANDO, QUEBRADA, MANUTENCAO
    }

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public String getProblema() { return problema; }
    public void setProblema(String problema) { this.problema = problema; }

    public String getSetorAntigo() { return setorAntigo; }
    public void setSetorAntigo(String setorAntigo) { this.setorAntigo = setorAntigo; }

    public String getSetorNovo() { return setorNovo; }
    public void setSetorNovo(String setorNovo) { this.setorNovo = setorNovo; }

    public String getMarcaModelo() { return marcaModelo; }
    public void setMarcaModelo(String marcaModelo) { this.marcaModelo = marcaModelo; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
