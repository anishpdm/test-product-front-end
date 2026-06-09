import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product, ProductService } from './product.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="wrap">
      <h1>Product Manager v1.0.1 </h1>
     

      <form class="card" (ngSubmit)="save()">
        <h2>{{ editing() ? 'Edit' : 'Add' }} product</h2>
        <input [(ngModel)]="form.name" name="name" placeholder="Name" required />
        <input [(ngModel)]="form.description" name="description" placeholder="Description" />
        <input [(ngModel)]="form.price" name="price" type="number" step="0.01" placeholder="Price" />
        <input [(ngModel)]="form.stock" name="stock" type="number" placeholder="Stock" />
        <div class="row">
          <button type="submit">{{ editing() ? 'Update' : 'Add' }}</button>
          <button type="button" class="ghost" *ngIf="editing()" (click)="reset()">Cancel</button>
        </div>
      </form>

      <div class="card" *ngIf="error()">{{ error() }}</div>

      <table *ngIf="products().length">
        <thead>
          <tr><th>Name</th><th>Description</th><th>Price</th><th>Stock</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of products()">
            <td>{{ p.name }}</td>
            <td>{{ p.description }}</td>
            <td>₹{{ p.price }}</td>
            <td>{{ p.stock }}</td>
            <td class="actions">
              <button class="ghost" (click)="edit(p)">Edit</button>
              <button class="danger" (click)="remove(p.id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  `,
  styles: [`
    .wrap { max-width: 860px; margin: 40px auto; padding: 0 16px; }
    h1 { margin-bottom: 4px; }
    .sub { color: #94a3b8; margin-top: 0; }
    .card { background: #1e293b; padding: 20px; border-radius: 12px; margin: 16px 0; }
    input { display: block; width: 100%; padding: 10px; margin: 8px 0;
            background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; }
    .row { display: flex; gap: 8px; }
    button { padding: 10px 16px; border: 0; border-radius: 8px; cursor: pointer;
             background: #6366f1; color: white; font-weight: 600; }
    button.ghost { background: #334155; }
    button.danger { background: #dc2626; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 12px; overflow: hidden; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
    .actions { display: flex; gap: 6px; }
  `]
})
export class App implements OnInit {
  products = signal<Product[]>([]);
  editing = signal(false);
  error = signal('');
  form: Partial<Product> = this.empty();

  constructor(private svc: ProductService) {}

  ngOnInit() { this.load(); }

  empty(): Partial<Product> {
    return { name: '', description: '', price: 0, stock: 0 };
  }

  load() {
    this.svc.getAll().subscribe({
      next: data => this.products.set(data),
      error: () => this.error.set('Could not reach the API. Is the backend running?')
    });
  }

  save() {
    if (this.editing()) {
      this.svc.update(this.form as Product).subscribe({ next: () => { this.reset(); this.load(); } });
    } else {
      this.svc.create(this.form).subscribe({ next: () => { this.reset(); this.load(); } });
    }
  }

  edit(p: Product) { this.form = { ...p }; this.editing.set(true); }
  remove(id: number) { this.svc.delete(id).subscribe({ next: () => this.load() }); }
  reset() { this.form = this.empty(); this.editing.set(false); }
}
