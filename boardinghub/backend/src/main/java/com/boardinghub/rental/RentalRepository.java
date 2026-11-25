package com.boardinghub.rental;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.SimpleJdbcInsert;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** All table/column identifiers are internal constants; request values are always bound parameters. */
@Repository
public class RentalRepository {
    private static final Set<String> TABLES = Set.of("rooms","persons","contracts","rent_rates","contract_services",
        "occupancies","handovers","billing_periods","meter_readings","invoices","invoice_items","payments",
        "payment_allocations","checkouts","checkout_deductions","deposit_transactions","deposit_allocations","service_prices");
    private final JdbcTemplate jdbc;
    public RentalRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    private String table(String name) {
        if (!TABLES.contains(name)) throw new IllegalArgumentException("Unknown rental table");
        return "rental_" + name;
    }
    public List<Map<String,Object>> all(String name, long owner) {
        return jdbc.queryForList("SELECT * FROM " + table(name) + " WHERE owner_id=? ORDER BY id", owner);
    }
    public List<Map<String,Object>> tenantPersons(String email) {
        return jdbc.queryForList("SELECT p.* FROM rental_persons p JOIN app_users u ON u.id=p.account_id WHERE LOWER(u.email)=LOWER(?) ORDER BY p.id",email);
    }
    public List<Map<String,Object>> find(String name,long owner,String key,long id) {
        if(!Set.of("contract_id","person_id","period_id","invoice_id","checkout_id").contains(key)) throw new IllegalArgumentException("Unknown relation");
        return jdbc.queryForList("SELECT * FROM "+table(name)+" WHERE owner_id=? AND "+key+"=? ORDER BY id",owner,id);
    }
    public Map<String,Object> one(String name, long owner, long id, boolean lock) {
        var rows = jdbc.queryForList("SELECT * FROM " + table(name) + " WHERE owner_id=? AND id=?" + (lock ? " FOR UPDATE" : ""),owner,id);
        if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy bản ghi trong tài khoản của bạn.");
        return rows.getFirst();
    }
    public long insert(String name, long owner, Map<String,Object> values) {
        var data = new LinkedHashMap<>(values); data.put("owner_id",owner);
        return new SimpleJdbcInsert(jdbc).withTableName(table(name)).usingGeneratedKeyColumns("id")
            .usingColumns(data.keySet().toArray(String[]::new)).executeAndReturnKey(data).longValue();
    }
    public void update(String name, long owner, long id, Map<String,Object> values) {
        var args = new ArrayList<>(values.values()); args.add(owner); args.add(id);
        jdbc.update("UPDATE " + table(name) + " SET " + String.join(",",values.keySet().stream().map(key->key+"=?").toList())
            + " WHERE owner_id=? AND id=?", args.toArray());
    }
    public Map<String,List<Map<String,Object>>> snapshot(long owner) {
        var state = new LinkedHashMap<String,List<Map<String,Object>>>();
        TABLES.stream().sorted().forEach(name -> state.put(name, all(name,owner)));
        return state;
    }
}
