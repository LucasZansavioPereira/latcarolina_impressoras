package com.printers.control.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

@Component
public class DatabaseMigration implements CommandLineRunner {

    private final DataSource dataSource;

    public DatabaseMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        try (Connection conn = dataSource.getConnection(); Statement st = conn.createStatement()) {
            ensurePrinterTableColumns(conn, st);
            removeCodigoUniqueConstraints(conn, st);
            clearPrinterData(conn, st);
        } catch (SQLException e) {
            System.err.println("DatabaseMigration: unable to prepare printer schema — " + e.getMessage());
        }
    }

    private void ensurePrinterTableColumns(Connection conn, Statement st) throws SQLException {
        try {
            st.execute("ALTER TABLE printers ALTER COLUMN status SET DATA TYPE VARCHAR");
            st.execute("ALTER TABLE printers ALTER COLUMN connectivity_status SET DATA TYPE VARCHAR");
        } catch (SQLException e) {
            System.err.println("DatabaseMigration: unable to alter printer status columns — " + e.getMessage());
        }

        boolean hasCodigoColumn = false;
        try (ResultSet columns = conn.getMetaData().getColumns(null, null, "PRINTERS", "CODIGO")) {
            hasCodigoColumn = columns.next();
        }

        if (!hasCodigoColumn) {
            st.execute("ALTER TABLE printers ADD COLUMN codigo VARCHAR(255)");
        }
    }

    private void removeCodigoUniqueConstraints(Connection conn, Statement st) throws SQLException {
        // In H2, use INFORMATION_SCHEMA.TABLE_CONSTRAINTS to find unique constraints
        try (ResultSet constraints = st.executeQuery(
                "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME='PRINTERS' AND CONSTRAINT_TYPE='UNIQUE'")) {
            while (constraints.next()) {
                String constraintName = constraints.getString("CONSTRAINT_NAME");
                if (constraintName != null && !constraintName.isBlank()) {
                    try {
                        st.execute("ALTER TABLE PRINTERS DROP CONSTRAINT " + constraintName);
                        System.err.println("DatabaseMigration: dropped unique constraint " + constraintName + " on PRINTERS");
                    } catch (SQLException ex) {
                        System.err.println("DatabaseMigration: failed dropping constraint " + constraintName + " — " + ex.getMessage());
                    }
                }
            }
        } catch (SQLException ex) {
            System.err.println("DatabaseMigration: unable to query constraints — " + ex.getMessage());
        }
    }

    private void clearPrinterData(Connection conn, Statement st) throws SQLException {
        try {
            st.execute("DELETE FROM PRINTERS");
            System.out.println("DatabaseMigration: removed all printer records while preserving users");
        } catch (SQLException e) {
            System.err.println("DatabaseMigration: unable to delete printers — " + e.getMessage());
        }
    }
}
