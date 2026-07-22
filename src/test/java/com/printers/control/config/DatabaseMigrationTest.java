package com.printers.control.config;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertFalse;

class DatabaseMigrationTest {

    @Test
    void shouldDropUniqueIndexOnCodigo() throws Exception {
        String url = "jdbc:h2:mem:printer-migration-test;DB_CLOSE_DELAY=-1;MODE=LEGACY";
        try (Connection conn = DriverManager.getConnection(url, "sa", "")) {
            try (Statement st = conn.createStatement()) {
                st.execute("CREATE TABLE PRINTERS (ID VARCHAR(255) PRIMARY KEY, CODIGO VARCHAR(255))");
                st.execute("CREATE UNIQUE INDEX UK_TEST_CODIGO ON PRINTERS(CODIGO)");
            }

            DataSource dataSource = new SingleConnectionDataSource(conn, true);
            DatabaseMigration migration = new DatabaseMigration(dataSource);
            migration.run();

            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM INFORMATION_SCHEMA.INDEXES WHERE TABLE_NAME='PRINTERS' AND INDEX_NAME='UK_TEST_CODIGO'")) {
                rs.next();
                assertFalse(rs.getInt(1) > 0, "A unique index on printers.codigo should have been removed");
            }
        }
    }
}
