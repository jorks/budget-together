<?php

namespace App\Http\Controllers;

use App\Models\Household;
use App\Services\HouseholdResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class CategoryController extends Controller
{
    public function store(Request $request, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        $request->merge(['name' => is_string($request->input('name')) ? trim($request->input('name')) : $request->input('name')]);
        $data = $request->validate(['name' => ['required', 'string', 'max:80']]);
        $name = trim($data['name']);
        DB::transaction(function () use ($household, $name): void {
            $locked = Household::query()->lockForUpdate()->findOrFail($household->id);
            $categories = collect($locked->categories ?? []);
            $available = collect(Household::DEFAULT_CATEGORIES)->merge($categories)->merge($locked->items()->pluck('category')->filter());
            if (! $available->contains(fn (string $category): bool => mb_strtolower($category) === mb_strtolower($name))) {
                $locked->update(['categories' => $categories->push($name)->sort()->values()->all()]);
            }
        });

        return back();
    }
}
