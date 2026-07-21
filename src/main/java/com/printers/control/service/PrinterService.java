package com.printers.control.service;

import com.printers.control.model.Printer;
import com.printers.control.repository.PrinterRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
public class PrinterService {

    private final PrinterRepository repository;

    public PrinterService(PrinterRepository repository) {
        this.repository = repository;
    }

    public List<Printer> findAll() {
        return repository.findAllByOrderByUpdatedAtDesc();
    }

    public Printer findById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Impressora não encontrada: " + id));
    }

    public Printer create(Printer printer) {
        printer.setId(null);
        if (printer.getStatus() == null) {
            printer.setStatus(Printer.Status.FUNCIONANDO);
        }
        validateConnectionFields(printer);
        if (printer.getStatus() != Printer.Status.BACKUP) {
            List<Printer> same = repository.findByCodigo(printer.getCodigo()).stream()
                    .filter(p -> p.getStatus() != Printer.Status.BACKUP)
                    .toList();
            if (!same.isEmpty()) {
                throw new IllegalArgumentException("Código já existe. Apenas impressoras não-BACKUP devem ser únicas.");
            }
        }
        return repository.save(printer);
    }

    public Printer update(String id, Printer changes) {
        Printer existing = findById(id);
        String finalCodigo = changes.getCodigo() != null ? changes.getCodigo() : existing.getCodigo();
        Printer.Status finalStatus = (changes.getStatus() != null) ? changes.getStatus() : existing.getStatus();

        // validate codigo uniqueness rule against other printers
        if (finalStatus != Printer.Status.BACKUP) {
            List<Printer> others = repository.findByCodigo(finalCodigo).stream()
                    .filter(p -> !p.getId().equals(id))
                    .filter(p -> p.getStatus() != Printer.Status.BACKUP)
                    .collect(Collectors.toList());
            if (!others.isEmpty()) {
                throw new IllegalArgumentException("Código já existe. Apenas impressoras não-BACKUP devem ser únicas.");
            }
        }

        existing.setCodigo(finalCodigo);
        existing.setStatus(changes.getStatus() != null ? changes.getStatus() : existing.getStatus());
        existing.setProblema(changes.getProblema());
        existing.setSetorAntigo(changes.getSetorAntigo());
        existing.setSetorNovo(changes.getSetorNovo());
        existing.setMarcaModelo(changes.getMarcaModelo());
        existing.setIp(changes.getIp());
        existing.setConnectionType(changes.getConnectionType() != null ? changes.getConnectionType() : existing.getConnectionType());
        validateConnectionFields(existing);
        return repository.save(existing);
    }

    private void validateConnectionFields(Printer printer) {
        if (printer.getConnectionType() == Printer.ConnectionType.ETHERNET) {
            if (printer.getIp() == null || printer.getIp().isBlank()) {
                throw new IllegalArgumentException("Para conexão Ethernet, o endereço IP é obrigatório");
            }
            if (printer.getMarcaModelo() == null || printer.getMarcaModelo().isBlank()) {
                throw new IllegalArgumentException("Para conexão Ethernet, o endereço MAC é obrigatório");
            }
        } else {
            // USB: clear network-related fields to avoid confusion
            printer.setIp(null);
            printer.setMarcaModelo(null);
            printer.setConnectivityStatus(Printer.ConnectivityStatus.NAO_VERIFICADO);
        }
    }

    public void delete(String id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Impressora não encontrada: " + id);
        }
        repository.deleteById(id);
    }
}
