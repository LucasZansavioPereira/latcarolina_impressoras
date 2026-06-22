package com.printers.control.controller;

import com.printers.control.model.Printer;
import com.printers.control.service.PrinterService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/printers")
public class PrinterController {

    private final PrinterService service;

    public PrinterController(PrinterService service) {
        this.service = service;
    }

    @GetMapping
    public List<Printer> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Printer findById(@PathVariable String id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Printer create(@Valid @RequestBody Printer printer) {
        return service.create(printer);
    }

    @PutMapping("/{id}")
    public Printer update(@PathVariable String id, @Valid @RequestBody Printer printer) {
        return service.update(id, printer);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        service.delete(id);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("erro", ex.getMessage()));
    }
}
