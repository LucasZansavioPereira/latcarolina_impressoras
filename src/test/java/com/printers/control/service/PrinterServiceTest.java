package com.printers.control.service;

import com.printers.control.model.Printer;
import com.printers.control.repository.PrinterRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PrinterServiceTest {

    @Mock
    private PrinterRepository repository;

    @InjectMocks
    private PrinterService service;

    @Test
    void updateShouldAllowDuplicateCodesAcrossPrinters() {
        Printer existing = new Printer();
        existing.setId("printer-1");
        existing.setCodigo("PRINTER-01");
        existing.setStatus(Printer.Status.FUNCIONANDO);

        Printer other = new Printer();
        other.setId("printer-2");
        other.setCodigo("PRINTER-01");
        other.setStatus(Printer.Status.FUNCIONANDO);

        when(repository.findById("printer-1")).thenReturn(Optional.of(existing));
        when(repository.save(any(Printer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Printer changes = new Printer();
        changes.setCodigo("PRINTER-01");
        changes.setStatus(Printer.Status.FUNCIONANDO);

        Printer updated = service.update("printer-1", changes);

        assertEquals("PRINTER-01", updated.getCodigo());
        verify(repository).save(any(Printer.class));
    }
}
